const express = require("express");
const router = express.Router();
const { addComment, toggleLike, toggleCommentLike, generateShareLink, toggleFollow, getRelationships, getComments, getReplies, savePost, getSavedPosts, hidePost } = require("../controllers/interactions");
const { authenticate } = require("@zuvo/shared");

// Helper for optional auth
const optionalAuth = (req, res, next) => {
    if (req.headers.authorization) return authenticate(req, res, next);
    next();
};

router.post("/comments", authenticate, addComment);
router.post("/comments/like", authenticate, toggleCommentLike);
router.get("/comments/:postId", getComments);
router.get("/comments/replies/:commentId", getReplies);
router.post("/like", authenticate, toggleLike);
router.get("/share/:postId", generateShareLink);
router.post("/follow", authenticate, toggleFollow);
router.get("/relationships/:userId", optionalAuth, getRelationships);

router.post("/save", authenticate, savePost);
router.get("/saved", authenticate, getSavedPosts);
router.post("/hide", authenticate, hidePost);

module.exports = router;
