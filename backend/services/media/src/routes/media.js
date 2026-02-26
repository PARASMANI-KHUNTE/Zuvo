const express = require("express");
const router = express.Router();
const { uploadFile, deleteFile, getDownloadUrl, getStreamUrl } = require("../controllers/media");
const { upload } = require("../configs/cloudinary");
const { authenticate } = require("@zuvo/shared");

/**
 * @openapi
 * /api/v1/media/upload:
 *   post:
 *     tags: [Media]
 *     summary: Upload image or video to Cloudinary
 *     security:
 *       - bearerAuth: []
 */
router.post("/upload", authenticate, upload.single("file"), uploadFile);

/**
 * @openapi
 * /api/v1/media/download/{publicId}:
 *   get:
 *     tags: [Media]
 *     summary: Get a signed, time-limited download URL
 *     security:
 *       - bearerAuth: []
 */
router.get("/download/:publicId", authenticate, getDownloadUrl);

/**
 * @openapi
 * /api/v1/media/stream/{publicId}:
 *   get:
 *     tags: [Media]
 *     summary: Get HLS streaming URL for a video
 */
router.get("/stream/:publicId", getStreamUrl);

/**
 * @openapi
 * /api/v1/media/{publicId}:
 *   delete:
 *     tags: [Media]
 *     summary: Delete a file from Cloudinary
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:publicId", authenticate, deleteFile);

module.exports = router;
