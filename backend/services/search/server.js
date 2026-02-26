const express = require("express");
const dotenv = require("dotenv");
const { logger, requestTrace, connectRedis, redisClient, connectDB, Post, User, initTracing, metrics, faultInjection, errorHandler, authenticate } = require("@zuvo/shared");

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
                .populate("author", "name username")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            results.posts = posts;
        }

        if (type === "users" || type === "all") {
            const users = await User.find({
                $or: [
                    { name: searchRegex },
                    { username: searchRegex }
                ]
            })
                .select("name username")
                .skip(skip)
                .limit(parseInt(limit));

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

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 8006;
app.listen(PORT, async () => {
    await connectDB();
    await connectRedis();
    logger.info(`Search service running on port ${PORT}`);
});
