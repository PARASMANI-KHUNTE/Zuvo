const { asyncHandler, logger, redisClient, MessageBus, internalServices } = require("@zuvo/shared");
const Comment = require("../models/Comment");

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
        user: req.user.id,
        content,
        parentComment: parentCommentId || null
    });

    // Increment comment counter atomically in Redis
    await redisClient.incr(`post:${postId}:comments`);

    // FIX G1: Fetch the post to get the real author, then notify them
    // FIX G2: MessageBus imported at top level
    try {
        const post = await internalServices.getPost(postId);
        if (post && post.author.toString() !== req.user.id.toString()) {
            // Only notify if commenter != post author (no self-notifications)
            await MessageBus.publish("zuvo_tasks", {
                type: "NOTIFICATION",
                userId: post.author.toString(),
                notificationType: "COMMENT",
                actorId: req.user.id,
                content: `${req.user.name || "Someone"} commented on your post: "${content.substring(0, 30)}..."`
            });
        }
    } catch (notifyErr) {
        // Non-fatal — log but don't fail the request
        logger.warn(`Failed to send comment notification: ${notifyErr.message}`);
    }

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
    const userId = req.user.id;

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
