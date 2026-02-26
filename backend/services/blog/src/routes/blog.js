const express = require("express");
const router = express.Router();
const {
    createPost,
    getPosts,
    getPost,
    updatePost,
    deletePost
} = require("../controllers/blog");
const { authenticate } = require("@zuvo/shared");




router.route("/")
    .post(authenticate, createPost)
    .get(getPosts);

router.route("/:id")
    .get(getPost)
    .put(authenticate, updatePost)
    .delete(authenticate, deletePost);

module.exports = router;
