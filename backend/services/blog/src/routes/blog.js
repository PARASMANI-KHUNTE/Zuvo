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




/**
 * @openapi
 * /api/v1/blogs:
 *   get:
 *     tags: [Blogs]
 *     summary: Get all published posts
 *     responses:
 *       200:
 *         description: List of posts
 *   post:
 *     tags: [Blogs]
 *     summary: Create a new post
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Post created successfully
 */
router.route("/")
    .post(authenticate, createPost)
    .get(getPosts);

/**
 * @openapi
 * /api/v1/blogs/{id}:
 *   get:
 *     tags: [Blogs]
 *     summary: Get a single post by ID or Slug
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post details
 *   put:
 *     tags: [Blogs]
 *     summary: Update a post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post updated
 *   delete:
 *     tags: [Blogs]
 *     summary: Delete a post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post deleted successfully
 */
router.route("/:id")
    .get(getPost)
    .put(authenticate, updatePost)
    .delete(authenticate, deletePost);

module.exports = router;

