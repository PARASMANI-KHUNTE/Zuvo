const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const userId = (req.user?.id || req.user?._id || "anonymous").toString();
        const isVideo = file.mimetype.startsWith("video");
        const isAudio = file.mimetype.startsWith("audio");
        const isImage = file.mimetype.startsWith("image");

        let resource_type = "raw"; // default for docs/pdfs
        if (isVideo || isAudio) resource_type = "video"; // cloudinary handles audio as video
        if (isImage) resource_type = "image";

        // Preserve extension for raw types or default
        const ext = path.extname(file.originalname).substring(1);
        const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
        const publicId = `usr_${safeUserId}__${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        return {
            folder: `blogging-app/${safeUserId}`,
            public_id: publicId,
            resource_type: resource_type,
            format: isImage ? (ext || "jpg") : isVideo ? "mp4" : ext,
            transformation: isImage
                ? [{ width: 1200, crop: "limit", quality: "auto" }]
                : isVideo ? [{ quality: "auto", fetch_format: "auto" }] : undefined
        };
    },
});

const fileFilter = (req, file, cb) => {
    const isVideo = file.mimetype.startsWith("video");
    const isAudio = file.mimetype.startsWith("audio");
    const isImage = file.mimetype.startsWith("image");

    // File size approximations from headers before full buffer load
    const contentLen = parseInt(req.headers["content-length"] || "0");
    const MB = 1024 * 1024;

    if (isVideo && contentLen > 100 * MB) return cb(new Error("Video exceeds 100MB limit"));
    if (isAudio && contentLen > 10 * MB) return cb(new Error("Audio exceeds 10MB limit"));
    if (isImage && contentLen > 10 * MB) return cb(new Error("Image exceeds 10MB limit"));
    if (!isVideo && !isAudio && !isImage && contentLen > 10 * MB) return cb(new Error("Document exceeds 10MB limit"));

    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // Hard upper limit of 100MB for the entire stream
    }
});

module.exports = { cloudinary, upload };
