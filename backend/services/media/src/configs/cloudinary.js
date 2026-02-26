const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isVideo = file.mimetype.startsWith("video");
        return {
            folder: "blogging-app",
            resource_type: isVideo ? "video" : "image",
            format: isVideo ? "mp4" : "jpg",
            transformation: isVideo
                ? [{ quality: "auto", fetch_format: "auto" }]
                : [{ width: 1200, crop: "limit", quality: "auto" }]
        };
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

module.exports = { cloudinary, upload };
