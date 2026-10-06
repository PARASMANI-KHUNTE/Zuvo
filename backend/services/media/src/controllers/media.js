const { asyncHandler, logger, MessageBus } = require("@zuvo/shared");
const { cloudinary } = require("../configs/cloudinary");

const isMediaOwner = (req, publicId) => {
    const userId = (req.user?.id || req.user?._id || "").toString();
    const role = req.user?.role;
    if (!userId) return false;
    if (role === "admin") return true;

    const lastSegment = (publicId || "").split("/").pop();
    return lastSegment.startsWith(`usr_${userId}__`);
};

/**
 * @desc    Upload single file (image or video)
 * @route   POST /api/v1/media/upload
 * @access  Private
 */
exports.uploadFile = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Please upload a file" });
    }

    logger.info(`File uploaded successfully: ${req.file.path} (Request ID: ${req.requestId})`);

    // Offload derivative generation (compressed variants) to the background worker
    const resourceType = req.file.mimetype.startsWith("video")
        ? "video"
        : req.file.mimetype.startsWith("image") ? "image" : "raw";

    if (resourceType !== "raw") {
        try {
            await MessageBus.publish("zuvo_tasks", {
                type: "MEDIA_COMPRESSION",
                publicId: req.file.filename,
                resourceType,
                userId: (req.user?.id || req.user?._id || "").toString()
            });
        } catch (err) {
            logger.error(`Failed to enqueue media compression for ${req.file.filename}: ${err.message}`);
        }
    }

    res.status(200).json({
        success: true,
        data: {
            url: req.file.path,
            publicId: req.file.filename,
            resourceType
        }
    });
});

/**
 * @desc    Generate compressed derivatives of an already uploaded asset (internal)
 * @route   POST /api/v1/media/internal/compress
 * @access  Internal (ownership enforced via the uploader id embedded in publicId)
 */
exports.compressMedia = asyncHandler(async (req, res, next) => {
    const { publicId, resourceType, userId } = req.body;

    if (!publicId) {
        return res.status(400).json({ success: false, message: "publicId is required" });
    }

    const isVideo = resourceType === "video";
    if (!isVideo && resourceType !== "image") {
        return res.status(400).json({ success: false, message: "Only image or video assets can be compressed" });
    }

    // publicId is generated as `usr_{userId}__{timestamp}_{rand}` (see cloudinary storage)
    if (userId) {
        const lastSegment = publicId.split("/").pop();
        if (!lastSegment.startsWith(`usr_${userId}__`)) {
            return res.status(403).json({ success: false, message: "Not authorized to compress this file" });
        }
    }

    const eager = isVideo
        ? [{ format: "mp4", quality: "auto", width: 1280, crop: "limit" }]
        : [{ fetch_format: "auto", quality: "auto" }];

    const result = await cloudinary.uploader.explicit(publicId, {
        type: "upload",
        resource_type: isVideo ? "video" : "image",
        eager,
        eager_async: true
    });

    logger.info(`Compression scheduled for ${publicId}`, { requestId: req.requestId });

    res.status(200).json({
        success: true,
        data: {
            publicId,
            eager: result.eager || []
        }
    });
});

/**
 * @desc    Delete file from Cloudinary
 * @route   DELETE /api/v1/media/:publicId
 * @access  Private
 */
exports.deleteFile = asyncHandler(async (req, res, next) => {
    const { publicId } = req.params;
    const resourceType = req.query.type || "image";

    if (!isMediaOwner(req, publicId)) {
        return res.status(403).json({ success: false, message: "Not authorized to delete this file" });
    }

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    if (result.result !== "ok") {
        return res.status(400).json({ success: false, message: "Failed to delete file" });
    }

    res.status(200).json({ success: true, message: "File deleted successfully" });
});

/**
 * @desc    Get a signed download URL (time-limited, secure)
 * @route   GET /api/v1/media/download/:publicId
 * @access  Private
 */
exports.getDownloadUrl = asyncHandler(async (req, res, next) => {
    const { publicId } = req.params;
    const resourceType = req.query.type || "image";

    if (!isMediaOwner(req, publicId)) {
        return res.status(403).json({ success: false, message: "Not authorized to access this file" });
    }

    // Generate a signed, time-limited URL (1 hour expiry)
    const signedUrl = cloudinary.url(publicId, {
        resource_type: resourceType,
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        flags: "attachment" // forces download in browser
    });

    if (!signedUrl) {
        return res.status(404).json({ success: false, message: "File not found" });
    }

    logger.info(`Download URL generated for ${publicId}`, { requestId: req.requestId });
    res.status(200).json({ success: true, data: { downloadUrl: signedUrl, expiresIn: 3600 } });
});

/**
 * @desc    Get a streaming URL (for video streaming via Cloudinary)
 * @route   GET /api/v1/media/stream/:publicId
 * @access  Public
 */
exports.getStreamUrl = asyncHandler(async (req, res, next) => {
    const { publicId } = req.params;
    const quality = req.query.quality || "auto";

    // Generate HLS/DASH streaming URL via Cloudinary
    const streamUrl = cloudinary.url(publicId, {
        resource_type: "video",
        streaming_profile: quality,
        format: "m3u8" // HLS format
    });

    logger.info(`Stream URL generated for ${publicId}`, { requestId: req.requestId });
    res.status(200).json({
        success: true,
        data: {
            streamUrl,
            format: "HLS",
            publicId
        }
    });
});
