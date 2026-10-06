const express = require("express");
const router = express.Router();
const { uploadFile, deleteFile, getDownloadUrl, getStreamUrl, compressMedia } = require("../controllers/media");
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

/**
 * @openapi
 * /api/v1/media/internal/compress:
 *   post:
 *     tags: [Media]
 *     summary: Generate compressed derivatives of an uploaded asset (internal/worker use)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [publicId]
 *             properties:
 *               publicId:
 *                 type: string
 *               resourceType:
 *                 type: string
 *                 enum: [image, video]
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Compression scheduled
 */
router.post("/internal/compress", compressMedia);

module.exports = router;
