const { asyncHandler, MessageBus, audit, internalServices, models } = require("@zuvo/shared");
const Post = models.Post();

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Post.countDocuments({ status: "published", isDeleted: { $ne: true } });

    const posts = await Post.find({ status: "published", isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    // DECOUPLING FIX: Manually compose author data via internal service call
    const postsWithAuthors = await Promise.all(posts.map(async (post) => {
        const postObj = post.toObject();
        postObj.author = await internalServices.getUserProfile(post.author);
        return postObj;
    }));

    res.status(200).json({
        success: true,
        count: posts.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: postsWithAuthors
    });
});

// @route   GET /api/v1/blogs/:slugOrId
// @access  Public
exports.getPost = asyncHandler(async (req, res, next) => {
    let post;

    // Check if it's a valid ObjectId or a slug
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        post = await Post.findById(req.params.id);
    }

    if (!post) {
        post = await Post.findOne({ slug: req.params.id });
    }

    if (!post) {
        return res.status(404).json({ success: false, message: "Post not found" });
    }

    // DECOUPLING FIX: Manually compose author data
    const postWithAuthor = post.toObject();
    postWithAuthor.author = await internalServices.getUserProfile(post.author);

    res.status(200).json({
        success: true,
        data: postWithAuthor
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
