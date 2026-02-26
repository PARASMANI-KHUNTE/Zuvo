const express = require("express");
const router = express.Router();
const { uploadFile, deleteFile } = require("../controllers/media");
const { upload } = require("../configs/cloudinary");
const { authenticate } = require("@zuvo/shared");


router.post("/upload", authenticate, upload.single("file"), uploadFile);
router.get("/download/:publicId", authenticate, getDownloadUrl);
router.get("/stream/:publicId", getStreamUrl);
router.delete("/:publicId", authenticate, deleteFile);


module.exports = router;
