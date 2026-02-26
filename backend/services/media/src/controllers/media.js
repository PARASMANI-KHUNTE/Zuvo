const { asyncHandler, logger } = require("@zuvo/shared");
const { cloudinary } = require("../configs/cloudinary");

/**
 * @desc    Upload single file (image or video)
 * @route   POST /api/v1/media/upload
 * @access  Private
 */
exports.uploadFile = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Please upload a file" });
    }

    logger.info(`File uploaded successfully: ${req.file.path}`, { requestId: req.requestId });

    res.status(200).json({
        success: true,
        data: {
            url: req.file.path,
            publicId: req.file.filename,
            resourceType: req.file.mimetype.startsWith("video") ? "video" : "image"
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
