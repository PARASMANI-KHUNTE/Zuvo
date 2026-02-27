const { asyncHandler, MessageBus, audit, internalServices, models, redisClient, logger } = require("@zuvo/shared");
const Comment = models.Comment();
const Relationship = require("../models/Relationship");

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
                content: `${req.user.name || "Someone"} commented on your post: "${content.substring(0, 30)}..."`
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
    const { postId, action } = req.body; // action: 'like' or 'dislike'
    const userId = req.user.id || req.user._id;

    if (!postId || !["like", "dislike"].includes(action)) {
        return res.status(400).json({ success: false, message: "postId and action (like/dislike) are required" });
    }

    const likeKey = `post:${postId}:likes`;
    const dislikeKey = `post:${postId}:dislikes`;
    const userVotedKey = `post:${postId}:user:${userId}:voted`;

    const existingVote = await redisClient.get(userVotedKey);

    if (existingVote === action) {
        // Undo the same vote (toggle off)
        if (action === "like") await redisClient.decr(likeKey);
        else await redisClient.decr(dislikeKey);
        await redisClient.del(userVotedKey);
        return res.status(200).json({ success: true, message: `${action} removed` });
    }

    if (existingVote) {
        // Switching vote: undo old vote first
        if (existingVote === "like") await redisClient.decr(likeKey);
        else await redisClient.decr(dislikeKey);
    }

    // Apply new vote
    if (action === "like") await redisClient.incr(likeKey);
    else await redisClient.incr(dislikeKey);
    await redisClient.set(userVotedKey, action);

    const [likes, dislikes] = await Promise.all([
        redisClient.get(likeKey),
        redisClient.get(dislikeKey)
    ]);

    // Publish sync task for DB update
    await MessageBus.publish("zuvo_tasks", {
        type: "LIKE_TOGGLE",
        postId,
        action, // 'like' or 'dislike'
        userId
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
    const shareUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/posts/${postId}?ref=app`;

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

    const existingRelationship = await Relationship.findOne({ follower: followerId, following: userId });

    if (existingRelationship) {
        await Relationship.deleteOne({ _id: existingRelationship._id });

        // Notify background task to update counts if needed
        await MessageBus.publish("zuvo_tasks", {
            type: "UNFOLLOW",
            followerId,
            followingId: userId
        });

        return res.status(200).json({ success: true, message: "Unfollowed successfully", isFollowing: false });
    }

    await Relationship.create({ follower: followerId, following: userId });

    // Notify user and update counts
    try {
        await Promise.all([
            MessageBus.publish("zuvo_tasks", {
                type: "NOTIFICATION",
                userId: userId,
                notificationType: "FOLLOW",
                actorId: followerId,
                content: `${req.user.name || "Someone"} started following you`
            }),
            MessageBus.publish("zuvo_tasks", {
                type: "FOLLOW",
                followerId,
                followingId: userId
            })
        ]);
    } catch (err) {
        logger.warn(`Failed to process follow events: ${err.message}`);
    }

    res.status(200).json({ success: true, message: "Followed successfully", isFollowing: true });
});

/**
 * @desc    Get followers and following count/status for a user
 * @route   GET /api/v1/interactions/relationships/:userId
 * @access  Public
 */
exports.getRelationships = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const currentUserId = req.user?.id || req.user?._id;

    const [followersCount, followingCount, isFollowing] = await Promise.all([
        Relationship.countDocuments({ following: userId }),
        Relationship.countDocuments({ follower: userId }),
        currentUserId ? Relationship.exists({ follower: currentUserId, following: userId }) : Promise.resolve(false)
    ]);

    res.status(200).json({
        success: true,
        data: {
            followersCount,
            followingCount,
            isFollowing: !!isFollowing
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
        .limit(limit);

    // Enrich with user profiles in bulk (Fix N+1 query)
    const userIds = comments.map(c => c.user);
    const userProfiles = await internalServices.getUsersProfiles(userIds);

    const enrichedComments = comments.map((comment, index) => {
        const commentObj = comment.toObject();
        commentObj.user = userProfiles[index];
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
        .sort({ createdAt: 1 });

    const userIds = replies.map(r => r.user);
    const userProfiles = await internalServices.getUsersProfiles(userIds);

    const enrichedReplies = replies.map((reply, index) => {
        const replyObj = reply.toObject();
        replyObj.user = userProfiles[index];
        return replyObj;
    });

    res.status(200).json({
        success: true,
        count: enrichedReplies.length,
        data: enrichedReplies
    });
});

const SavedPost = require("../models/SavedPost");
const HiddenPost = require("../models/HiddenPost");

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

    const existingSave = await SavedPost.findOne({ user: userId, post: postId });

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
        .limit(limit);

    const postIds = savedRecords.map(record => record.post);

    res.status(200).json({
        success: true,
        count: savedRecords.length,
        data: { postIds }
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
    const { commentId, action } = req.body; // action: 'like' or 'dislike'
    const userId = req.user.id || req.user._id;

    if (!commentId || !["like", "dislike"].includes(action)) {
        return res.status(400).json({ success: false, message: "commentId and action (like/dislike) are required" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const likeKey = `comment:${commentId}:likes`;
    const userVotedKey = `comment:${commentId}:user:${userId}:voted`;

    const existingVote = await redisClient.get(userVotedKey);

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
