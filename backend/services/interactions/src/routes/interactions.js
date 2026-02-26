const express = require("express");
const router = express.Router();
const { addComment, toggleLike, generateShareLink } = require("../controllers/interactions");
const { authenticate } = require("@zuvo/shared");


router.post("/comments", authenticate, addComment);
router.post("/like", authenticate, toggleLike);
router.get("/share/:postId", generateShareLink);

module.exports = router;
