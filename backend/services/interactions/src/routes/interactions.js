const express = require("express");
const router = express.Router();
const { addComment, toggleLike, generateShareLink, toggleFollow, getRelationships, getComments } = require("../controllers/interactions");
const { authenticate } = require("@zuvo/shared");

// Helper for optional auth
const optionalAuth = (req, res, next) => {
    if (req.headers.authorization) return authenticate(req, res, next);
    next();
};

router.post("/comments", authenticate, addComment);
router.get("/comments/:postId", getComments);
router.post("/like", authenticate, toggleLike);
router.get("/share/:postId", generateShareLink);
router.post("/follow", authenticate, toggleFollow);
router.get("/relationships/:userId", optionalAuth, getRelationships);

module.exports = router;
