const express = require("express");
const dotenv = require("dotenv");
const { models, logger, requestTrace, connectRedis, redisClient, connectDB, initTracing, metrics, faultInjection, errorHandler, authenticate, internalServices, HealthCheck } = require("@zuvo/shared");
const Post = models.Post();

dotenv.config();
process.env.SERVICE_NAME = "search-service";

initTracing(process.env.SERVICE_NAME);

const mongoose = require("mongoose");

const app = express();

app.use(requestTrace);
app.use(metrics.metricsMiddleware(process.env.SERVICE_NAME));
app.use(faultInjection);
app.use(express.json());

/**
 * @desc    Search posts and users
 * @route   GET /api/v1/search?q=query&type=posts|users|all&page=1&limit=10
 * @access  Public
 */
app.get("/api/v1/search", async (req, res, next) => {
    try {
        const { q, type = "all", page = 1, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: "Search query must be at least 2 characters" });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const searchRegex = new RegExp(q.trim(), "i");

        logger.info(`Search query: "${q}" | type: ${type}`);

        let results = {};

        // **FIX M2**: Real MongoDB text/regex search — no more mock data
        if (type === "posts" || type === "all") {
            const posts = await Post.find({
                isDeleted: { $ne: true },
                status: "published",
                $or: [
                    { title: searchRegex },
                    { content: searchRegex },
                    { tags: { $in: [searchRegex] } }
                ]
            })
                .select("title slug tags author image createdAt")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            // DECOUPLING FIX: Manually fetch author profiles
            const postsWithAuthors = await Promise.all(posts.map(async (post) => {
                const postObj = post.toObject();
                postObj.author = await internalServices.getUserProfile(post.author);
                return postObj;
            }));

            results.posts = postsWithAuthors;
        }

        if (type === "users" || type === "all") {
            const users = await internalServices.searchUsers(q, limit, skip);
            results.users = users;
        }

        res.status(200).json({
            success: true,
            query: q,
            page: parseInt(page),
            limit: parseInt(limit),
            data: results
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @desc    Get trending topics/posts
 * @route   GET /api/v1/search/trending
 * @access  Public
 */
app.get("/api/v1/search/trending", async (req, res, next) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const trendingPosts = await Post.find({
            status: "published",
            isDeleted: { $ne: true },
            createdAt: { $gte: sevenDaysAgo }
        })
            .sort({ likesCount: -1, createdAt: -1 })
            .limit(5);

        // Map to simpler format for sidebars
        const trends = trendingPosts.map(p => ({
            id: p._id,
            tag: p.tags[0] || "General",
            title: p.title,
            postsCount: p.likesCount + p.commentsCount // Using sum as "engagement" score
        }));

        res.status(200).json({ success: true, data: trends });
    } catch (err) {
        next(err);
    }
});

/**
 * @desc    Get suggested users to follow
 * @route   GET /api/v1/search/suggested-users
 * @access  Public
 */
app.get("/api/v1/search/suggested-users", async (req, res, next) => {
    try {
        // Just return some users for now (could be based on shared tags in future)
        const users = await internalServices.searchUsers("", 5);
        res.status(200).json({ success: true, data: users });
    } catch (err) {
        next(err);
    }
});

// Health Checks
app.get("/health", async (req, res) => {
    res.status(200).json(await HealthCheck.getHealth());
});

app.get("/ready", async (req, res) => {
    const ready = await HealthCheck.getReady();
    res.status(ready.status === "UP" ? 200 : 503).json(ready);
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 8006;
app.listen(PORT, async () => {
    await connectDB();
    await connectRedis();
    logger.info(`Search service running on port ${PORT}`);
});
