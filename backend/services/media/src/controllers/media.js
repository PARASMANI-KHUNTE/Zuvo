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
