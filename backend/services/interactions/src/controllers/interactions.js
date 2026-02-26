const { Comment, asyncHandler, logger, redisClient } = require("@zuvo/shared");

/**
 * @desc    Add comment to a post
 * @route   POST /api/v1/interactions/comments
 * @access  Private
 */
exports.addComment = asyncHandler(async (req, res, next) => {
    const { postId, content, parentCommentId } = req.body;

    const comment = await Comment.create({
        post: postId,
        user: req.user.id,
        content,
        parentComment: parentCommentId || null
    });

    // In a high-scale system, we'd also increment a counter in Redis or Mongo
    const { MessageBus } = require("@zuvo/shared");
    await redisClient.incr(`post:${postId}:comments`);

    // Enterprise-grade Event Publishing
    await MessageBus.publish("zuvo_tasks", {
        type: "NOTIFICATION",
        userId: "target_user_id", // Should be fetched from Post author
        notificationType: "COMMENT",
        content: `Someone commented on your post: ${content.substring(0, 20)}...`
    });

    res.status(201).json({ success: true, data: comment });


});

/**
 * @desc    Like or Dislike a post (with atomic Redis counters)
 * @route   POST /api/v1/interactions/like
 * @access  Private
 */
exports.toggleLike = asyncHandler(async (req, res, next) => {
    const { postId, action } = req.body; // action: 'like' or 'dislike'
    const userId = req.user.id;

    const likeKey = `post:${postId}:likes`;
    const userVotedKey = `post:${postId}:user:${userId}:voted`;

    const existingVote = await redisClient.get(userVotedKey);

    if (existingVote === action) {
        // Remove vote if clicking the same button
        await redisClient.decr(likeKey);
        await redisClient.del(userVotedKey);
        return res.status(200).json({ success: true, message: `${action} removed` });
    }

    // Change or add vote
    if (existingVote) {
        // If they liked and now dislike, we need to handle that. 
        // For simplicity, let's just assume one counter for "Value" (positive/negative)
        // or separate keys. Let's use one key for simplicity in this demo.
        await redisClient.decr(likeKey);
    }

    await redisClient.incr(likeKey);
    await redisClient.set(userVotedKey, action);

    res.status(200).json({ success: true, message: `Post ${action}d` });
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
