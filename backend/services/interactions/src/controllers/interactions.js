const { asyncHandler, MessageBus, audit, internalServices, models, redisClient, logger } = require("@zuvo/shared");
const Comment = models.Comment();
const Relationship = models.Relationship();
const Like = models.Like();

/**
 * @desc    Add comment to a post
 * @route   POST /api/v1/interactions/comments
 * @access  Private
 */
exports.addComment = asyncHandler(async (req, res, next) => {
    const { postId, content, parentCommentId } = req.body;

    if (!postId || !content) {
        return res.status(400).json({ success: false, message: "postId and content are required" });
    }

    const comment = await Comment.create({
        post: postId,
        user: req.user.id || req.user._id,
        content,
        parentComment: parentCommentId || null
    });

    // Increment comment counter atomically in Redis
    await redisClient.incr(`post:${postId}:comments`);

    // FIX G1: Fetch the post to get the real author, then notify them
    // FIX G2: MessageBus imported at top level
    try {
        const post = await internalServices.getPost(postId);
        if (post && post.author.toString() !== (req.user.id || req.user._id).toString()) {
            // Only notify if commenter != post author (no self-notifications)
            await MessageBus.publish("zuvo_tasks", {
                type: "NOTIFICATION",
                userId: post.author.toString(),
                notificationType: "COMMENT",
                actorId: req.user.id || req.user._id,
                content: `commented on your post: "${content.substring(0, 30)}${content.length > 30 ? "..." : ""}"`,
                targetId: postId,
                targetImage: post.media?.[0]?.url
            });
        }
    } catch (notifyErr) {
        // Non-fatal — log but don't fail the request
        logger.warn(`Failed to send comment notification: ${notifyErr.message}`);
    }

    // Publish sync task for DB update
    await MessageBus.publish("zuvo_tasks", {
        type: "COMMENT_CREATED",
        postId,
        commentId: comment._id
    });

    res.status(201).json({ success: true, data: comment });
});

/**
 * @desc    Like or Dislike a post (with atomic Redis counters)
 * @route   POST /api/v1/interactions/like
 * @access  Private
 * FIX G3: Separate like/dislike counters to handle state transitions correctly
 */
exports.toggleLike = asyncHandler(async (req, res, next) => {
    const { postId, action } = req.body; // action: 'like', 'unlike', or 'dislike'
    const userId = req.user.id || req.user._id;

    if (!postId || !["like", "unlike", "dislike"].includes(action)) {
        return res.status(400).json({ success: false, message: "postId and action (like/unlike/dislike) are required" });
    }

    const likeKey = `post:${postId}:likes`;
    const dislikeKey = `post:${postId}:dislikes`;
    const userVotedKey = `post:${postId}:user:${userId}:voted`;

    const existingVote = await redisClient.get(userVotedKey);
    const existingPersistedVote = await Like.findOne({ user: userId, post: postId }).select('action').lean();
    const currentVote = existingVote || existingPersistedVote?.action;
    let likesDelta = 0;

    if (action === "unlike") {
        if (currentVote === "like") {
            await redisClient.decr(likeKey);
            likesDelta = -1;
            await redisClient.del(userVotedKey);
            await Like.deleteOne({ user: userId, post: postId });
            await MessageBus.publish("zuvo_tasks", {
                type: "LIKE_TOGGLE",
                postId,
                action: "unlike",
                userId,
                likesDelta
            });
        }
        return res.status(200).json({ success: true, message: "like removed" });
    }

    if (currentVote === action) {
        // Undo the same vote (toggle off)
        if (action === "like") {
            await redisClient.decr(likeKey);
            likesDelta = -1;
        }
        else await redisClient.decr(dislikeKey);
        await redisClient.del(userVotedKey);
        await Like.deleteOne({ user: userId, post: postId });
        await MessageBus.publish("zuvo_tasks", {
            type: "LIKE_TOGGLE",
            postId,
            action,
            userId,
            likesDelta
        });
        return res.status(200).json({ success: true, message: `${action} removed` });
    }

    if (currentVote) {
        // Switching vote: undo old vote first
        if (currentVote === "like") {
            await redisClient.decr(likeKey);
            likesDelta -= 1;
        }
        else await redisClient.decr(dislikeKey);
    }

    // Apply new vote
    if (action === "like") {
        await redisClient.incr(likeKey);
        likesDelta += 1;
    }
    else await redisClient.incr(dislikeKey);
    await redisClient.set(userVotedKey, action);
    await Like.findOneAndUpdate(
        { user: userId, post: postId },
        { user: userId, post: postId, action },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const [likes, dislikes] = await Promise.all([
        redisClient.get(likeKey),
        redisClient.get(dislikeKey)
    ]);

    // Publish sync task for DB update
    await MessageBus.publish("zuvo_tasks", {
        type: "LIKE_TOGGLE",
        postId,
        action, // 'like' or 'dislike'
        userId,
        likesDelta
    });

    res.status(200).json({
        success: true,
        message: `Post ${action}d`,
        data: { likes: parseInt(likes) || 0, dislikes: parseInt(dislikes) || 0 }
    });
});

/**
 * @desc    Generate a shareable link
 * @route   GET /api/v1/interactions/share/:postId
 * @access  Public
 */
exports.generateShareLink = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const shareUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/post/${postId}?ref=app`;

    res.status(200).json({ success: true, data: { shareUrl } });
});

/**
 * @desc    Follow or Unfollow a user
 * @route   POST /api/v1/interactions/follow
 * @access  Private
 */
exports.toggleFollow = asyncHandler(async (req, res, next) => {
    const { userId } = req.body;
    const followerId = req.user.id || req.user._id;

    if (!userId) {
        return res.status(400).json({ success: false, message: "userId is required" });
    }

    if (userId.toString() === followerId.toString()) {
        return res.status(400).json({ success: false, message: "You cannot follow yourself" });
    }

    // 1. Fetch target user to check privacy and existence
    const targetUser = await internalServices.getInternalUser(userId);
    if (!targetUser || (targetUser.accountStatus && targetUser.accountStatus !== "active")) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Check for existing relationship
    const existing = await Relationship.findOne({ follower: followerId, following: userId });

    // 3. IDEMPOTENCY & TOGGLE LOGIC:
    if (existing) {
        if (existing.status === "requested" && !targetUser.isPrivate) {
            // Target was private, now public -> upgrade to following
            existing.status = "following";
            await existing.save();

            await MessageBus.publish("zuvo_tasks", {
                type: "FOLLOW_ACCEPTED",
                followerId: followerId,
                followingId: userId
            });
            return res.status(200).json({ success: true, status: "following", message: "Request upgraded to follow" });
        }

        // Otherwise (already following or cancelling request) -> Unfollow
        await Relationship.deleteOne({ _id: existing._id });
        await MessageBus.publish("zuvo_tasks", {
            type: "UNFOLLOW",
            followerId: followerId,
            followingId: userId
        });
        return res.status(200).json({ success: true, status: "none", message: "Unfollowed/Request cancelled" });
    }

    // 4. Create new relationship
    const status = targetUser.isPrivate ? "requested" : "following";

    try {
        await Relationship.create({
            follower: followerId,
            following: userId,
            status
        });

        if (status === "following") {
            await MessageBus.publish("zuvo_tasks", {
                type: "FOLLOW",
                followerId: followerId,
                followingId: userId
            });
        } else {
            await MessageBus.publish("zuvo_tasks", {
                type: "FOLLOW_REQUEST",
                followerId: followerId,
                followingId: userId
            });
        }

        return res.status(200).json({ success: true, status, message: status === "requested" ? "Request sent" : "Followed successfully" });
    } catch (err) {
        // Handle race condition (duplicate key error)
        if (err.code === 11000) {
            const retryExisting = await Relationship.findOne({ follower: followerId, following: userId }).select('status').lean();
            return res.status(200).json({
                success: true,
                status: retryExisting?.status || "none",
                message: "Idempotent response (concurrency handled)"
            });
        }
        throw err;
    }
});

/**
 * @desc    Get pending follow requests for current user
 * @route   GET /api/v1/interactions/requests
 * @access  Private
 */
exports.getFollowRequests = asyncHandler(async (req, res, next) => {
    const userId = req.user.id || req.user._id;
    const requests = await Relationship.find({ following: userId, status: "requested" })
        .sort({ createdAt: -1 })
        .select('follower createdAt')
        .lean();

    // Enrich with profiles via internal service
    const followerIds = requests.map(r => r.follower);
    const profiles = await internalServices.getUsersProfiles(followerIds);

    // Deterministic ID-based mapping
    const profileMap = new Map(profiles.map(p => [p.id.toString(), p]));

    const enrichedRequests = requests.map(req => ({
        id: req._id,
        followerId: req.follower,
        user: profileMap.get(req.follower.toString()),
        createdAt: req.createdAt
    }));

    res.status(200).json({ success: true, data: enrichedRequests });
});

/**
 * @desc    Accept or Reject follow request
 * @route   PUT /api/v1/interactions/requests/:requestId/:action
 * @access  Private
 */
exports.handleFollowRequest = asyncHandler(async (req, res, next) => {
    const { requestId, action } = req.params; // action: 'accept' or 'reject'
    const userId = req.user.id || req.user._id;

    const request = await Relationship.findById(requestId);

    if (!request || request.following.toString() !== userId.toString() || request.status !== "requested") {
        return res.status(404).json({ success: false, message: "Follow request not found or unauthorized" });
    }

    if (action === "accept") {
        request.status = "following";
        await request.save();

        // 2. Publish event for count updates & notifications
        await MessageBus.publish("zuvo_tasks", {
            type: "FOLLOW_ACCEPTED",
            followerId: request.follower,
            followingId: req.user._id
        });

        res.status(200).json({ success: true, message: `Follow request ${action}ed` });
    } else if (action === "reject") {
        await Relationship.deleteOne({ _id: request._id });
        return res.status(200).json({ success: true, message: "Follow request rejected" });
    }

    res.status(400).json({ success: false, message: "Invalid action" });
});

/**
 * @desc    Get followers and following count/status for a user
 * @route   GET /api/v1/interactions/relationships/:userId
 * @access  Public
 */
exports.getRelationships = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const currentUserId = req.user?.id || req.user?._id;

    const [followersCount, followingCount, relationship] = await Promise.all([
        Relationship.countDocuments({ following: userId, status: "following" }),
        Relationship.countDocuments({ follower: userId, status: "following" }),
        currentUserId ? Relationship.findOne({ follower: currentUserId, following: userId }).select('status').lean() : Promise.resolve(null)
    ]);

    res.status(200).json({
        success: true,
        data: {
            followersCount,
            followingCount,
            isFollowing: relationship?.status === "following",
            followStatus: relationship?.status || "none"
        }
    });
});

/**
 * @desc    Get comments for a post
 * @route   GET /api/v1/interactions/comments/:postId
 * @access  Public
 */
exports.getComments = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ post: postId, parentComment: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('user content createdAt likesCount parentComment post')
        .lean();

    // Enrich with user profiles in bulk (Fix N+1 query)
    const userIds = comments.map(c => c.user);
    const userProfiles = await internalServices.getUsersProfiles(userIds);

    const profileMap = new Map(userProfiles.map(p => [(p.id || p._id).toString(), p]));

    const enrichedComments = comments.map(comment => {
        const commentObj = { ...comment };
        const userId = (comment.user?._id || comment.user).toString();
        commentObj.user = profileMap.get(userId) || commentObj.user;
        return commentObj;
    });

    res.status(200).json({
        success: true,
        count: enrichedComments.length,
        data: enrichedComments
    });
});

/**
 * @desc    Get replies for a specific comment
 * @route   GET /api/v1/interactions/comments/replies/:commentId
 * @access  Public
 */
exports.getReplies = asyncHandler(async (req, res, next) => {
    const { commentId } = req.params;

    const replies = await Comment.find({ parentComment: commentId })
        .sort({ createdAt: 1 })
        .select('user content createdAt likesCount parentComment post')
        .lean();

    const userIds = replies.map(r => r.user);
    const userProfiles = await internalServices.getUsersProfiles(userIds);

    const profileMap = new Map(userProfiles.map(p => [(p.id || p._id).toString(), p]));

    const enrichedReplies = replies.map(reply => {
        const replyObj = { ...reply };
        const userId = (reply.user?._id || reply.user).toString();
        replyObj.user = profileMap.get(userId) || replyObj.user;
        return replyObj;
    });

    res.status(200).json({
        success: true,
        count: enrichedReplies.length,
        data: enrichedReplies
    });
});

const SavedPost = models.SavedPost();
const HiddenPost = models.HiddenPost();

/**
 * @desc    Save or Unsave a post
 * @route   POST /api/v1/interactions/save
 * @access  Private
 */
exports.savePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.body;
    const userId = req.user.id || req.user._id;

    if (!postId) {
        return res.status(400).json({ success: false, message: "postId is required" });
    }

    const existingSave = await SavedPost.findOne({ user: userId, post: postId }).lean();

    if (existingSave) {
        await SavedPost.deleteOne({ _id: existingSave._id });
        return res.status(200).json({ success: true, message: "Post unsaved", isSaved: false });
    }

    await SavedPost.create({ user: userId, post: postId });
    res.status(200).json({ success: true, message: "Post saved", isSaved: true });
});

/**
 * @desc    Get user's saved posts
 * @route   GET /api/v1/interactions/saved
 * @access  Private
 */
exports.getSavedPosts = asyncHandler(async (req, res, next) => {
    const userId = req.user.id || req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const savedRecords = await SavedPost.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('post')
        .lean();

    const postIds = savedRecords.map(record => record.post);

    res.status(200).json({
        success: true,
        count: savedRecords.length,
        data: { postIds }
    });
});

/**
 * @desc    Get posts liked by a user
 * @route   GET /api/v1/interactions/liked-posts/:userId
 * @access  Public
 */
exports.getLikedPosts = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const Post = models.Post();

    const likedRecords = await Like.find({ user: userId, action: "like" })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('post')
        .lean();

    const postIds = likedRecords.map(record => record.post);
    const posts = await Post.find({ _id: { $in: postIds }, status: "published", isDeleted: { $ne: true } })
        .select('title slug author tags media createdAt likesCount commentsCount content status')
        .lean();
    const postMap = new Map(posts.map(post => [post._id.toString(), post]));

    const orderedPosts = likedRecords
        .map(record => postMap.get(record.post.toString()))
        .filter(Boolean);

    const authorIds = [...new Set(orderedPosts.map(post => post.author.toString()))];
    const profiles = await internalServices.getUsersProfiles(authorIds);
    const profileMap = new Map(profiles.map(profile => [(profile.id || profile._id).toString(), profile]));

    const data = orderedPosts.map(post => {
        const postObj = { ...post };
        postObj.author = profileMap.get(post.author.toString()) || postObj.author;
        postObj.isLiked = true;
        return postObj;
    });

    res.status(200).json({
        success: true,
        count: data.length,
        data
    });
});

/**
 * @desc    Hide a post from feed
 * @route   POST /api/v1/interactions/hide
 * @access  Private
 */
exports.hidePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.body;
    const userId = req.user.id || req.user._id;

    if (!postId) {
        return res.status(400).json({ success: false, message: "postId is required" });
    }

    // Upsert to ignore duplicates without error
    await HiddenPost.updateOne(
        { user: userId, post: postId },
        { user: userId, post: postId },
        { upsert: true }
    );

    res.status(200).json({ success: true, message: "Post hidden" });
});

/**
 * @desc    Like or Dislike a comment
 * @route   POST /api/v1/interactions/comments/like
 * @access  Private
 */
exports.toggleCommentLike = asyncHandler(async (req, res, next) => {
    const { commentId, action } = req.body; // action: 'like', 'unlike', or 'dislike'
    const userId = req.user.id || req.user._id;

    if (!commentId || !["like", "unlike", "dislike"].includes(action)) {
        return res.status(400).json({ success: false, message: "commentId and action (like/unlike/dislike) are required" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const likeKey = `comment:${commentId}:likes`;
    const userVotedKey = `comment:${commentId}:user:${userId}:voted`;

    const existingVote = await redisClient.get(userVotedKey);

    if (action === "unlike") {
        if (existingVote === "like") {
            await redisClient.decr(likeKey);
            await redisClient.del(userVotedKey);
            const likes = await redisClient.get(likeKey);
            comment.likesCount = parseInt(likes) || 0;
            await comment.save();
        }
        return res.status(200).json({ success: true, message: "like removed", data: { likes: comment.likesCount } });
    }

    if (existingVote === action) {
        // Toggle off
        if (action === "like") await redisClient.decr(likeKey);
        await redisClient.del(userVotedKey);
        return res.status(200).json({ success: true, message: `${action} removed` });
    }

    if (existingVote) {
        if (existingVote === "like") await redisClient.decr(likeKey);
    }

    if (action === "like") await redisClient.incr(likeKey);
    await redisClient.set(userVotedKey, action);

    const likes = await redisClient.get(likeKey);

    // We can update the comment document in background or let sync handle it
    comment.likesCount = parseInt(likes) || 0;
    await comment.save();

    res.status(200).json({
        success: true,
        message: `Comment ${action}d`,
        data: { likes: comment.likesCount }
    });
});

/**
 * @desc    Get followers for a user
 * @route   GET /api/v1/interactions/relationships/:userId/followers
 * @access  Public
 */
exports.getFollowers = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const relationships = await Relationship.find({ following: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('follower')
        .lean();

    const followerIds = relationships.map(r => r.follower);
    const profiles = await internalServices.getUsersProfiles(followerIds);

    // Filter out profiles with 'Unknown User' if desired, or keep as is.
    // We'll also check if the current user is following these people
    const currentUserId = req.user?.id || req.user?._id;
    const enrichedProfiles = await Promise.all(profiles.map(async (profile) => {
        const profileId = profile.id || profile._id;
        const isFollowing = currentUserId ? await Relationship.exists({ follower: currentUserId, following: profileId }) : false;
        return { ...profile, isFollowing: !!isFollowing };
    }));

    res.status(200).json({
        success: true,
        count: enrichedProfiles.length,
        data: enrichedProfiles
    });
});

/**
 * @desc    Get users followed by a user
 * @route   GET /api/v1/interactions/relationships/:userId/following
 * @access  Public
 */
exports.getFollowing = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const relationships = await Relationship.find({ follower: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('following')
        .lean();

    const followingIds = relationships.map(r => r.following);
    const profiles = await internalServices.getUsersProfiles(followingIds);

    const currentUserId = req.user?.id || req.user?._id;
    const enrichedProfiles = await Promise.all(profiles.map(async (profile) => {
        const profileId = profile.id || profile._id;
        const isFollowing = currentUserId ? await Relationship.exists({ follower: currentUserId, following: profileId }) : false;
        return { ...profile, isFollowing: !!isFollowing };
    }));

    res.status(200).json({
        success: true,
        count: enrichedProfiles.length,
        data: enrichedProfiles
    });
});
