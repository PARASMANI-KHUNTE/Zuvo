const Post = require("../models/post");
const { asyncHandler, MessageBus, audit } = require("@zuvo/shared");

// @route   POST /api/v1/blogs
// @access  Private
exports.createPost = asyncHandler(async (req, res, next) => {
    // Add author from authenticated user
    req.body.author = req.user._id;

    const post = await Post.create(req.body);

    // Audit Log
    await audit.logAudit({
        userId: req.user._id,
        action: "POST_CREATE",
        resource: "Post",
        resourceId: post._id,
        newData: post,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        requestId: req.requestId
    });


    // Background Tasks
    await MessageBus.publish("zuvo_tasks", {
        type: "FEED_FANOUT",
        postId: post._id,
        authorId: req.user._id
    });

    await MessageBus.publish("zuvo_tasks", {
        type: "SEARCH_INDEX",
        postId: post._id,
        title: post.title
    });

    res.status(201).json({
        success: true,
        data: post
    });
});


// @route   GET /api/v1/blogs
// @access  Public
exports.getPosts = asyncHandler(async (req, res, next) => {
    const posts = await Post.find({ status: "published" }).populate({
        path: "author",
        select: "name username"
    });

    res.status(200).json({
        success: true,
        count: posts.length,
        data: posts
    });
});

// @route   GET /api/v1/blogs/:slugOrId
// @access  Public
exports.getPost = asyncHandler(async (req, res, next) => {
    let post;

    // Check if it's a valid ObjectId or a slug
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        post = await Post.findById(req.params.id).populate({
            path: "author",
            select: "name username"
        });
    }

    if (!post) {
        post = await Post.findOne({ slug: req.params.id }).populate({
            path: "author",
            select: "name username"
        });
    }

    if (!post) {
        return res.status(404).json({ success: false, message: "Post not found" });
    }

    res.status(200).json({
        success: true,
        data: post
    });
});


// @route   PUT /api/v1/blogs/:id
// @access  Private
exports.updatePost = asyncHandler(async (req, res, next) => {
    let post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Make sure user is post author
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Not authorized to update this post" });
    }

    const oldData = post.toObject();

    post = await Post.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    // Audit Log
    await audit.logAudit({
        userId: req.user._id,
        action: "POST_UPDATE",
        resource: "Post",
        resourceId: post._id,
        oldData,
        newData: post,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        requestId: req.requestId
    });

    res.status(200).json({

        success: true,
        data: post
    });
});

// @route   DELETE /api/v1/blogs/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res, next) => {
    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Make sure user is post author
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Not authorized to delete this post" });
    }

    // Use softDelete plugin method
    await post.softDelete();

    // Audit Log
    await audit.logAudit({
        userId: req.user._id,
        action: "POST_DELETE",
        resource: "Post",
        resourceId: post._id,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        requestId: req.requestId
    });

    res.status(200).json({
        success: true,
        data: {}
    });

});
