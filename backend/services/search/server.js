const express = require("express");
const dotenv = require("dotenv");
const { models, logger, requestTrace, connectRedis, redisClient, connectDB, initTracing, metrics, faultInjection, errorHandler, authenticate, optionalAuth, internalServices, HealthCheck, rateLimiter } = require("@zuvo/shared");
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
app.get("/api/v1/search", rateLimiter(3600, 500), async (req, res, next) => {
    try {
        const { q, type = "all", page = 1, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: "Search query must be at least 2 characters" });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const searchRegex = new RegExp(q.trim(), "i");

        logger.info(`Search query: "${q}" | type: ${type}`);

        let results = { posts: [], users: [] };
        let postAuthorIds = new Set();

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
                .select("title slug tags author media image createdAt")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const postsWithAuthors = await Promise.all(posts.map(async (post) => {
                const postObj = post.toObject();
                postObj.author = await internalServices.getUserProfile(post.author);
                if (postObj.author && postObj.author._id) {
                    postAuthorIds.add(postObj.author._id.toString());
                }
                return postObj;
            }));

            results.posts = postsWithAuthors;
        }

        if (type === "users" || type === "all") {
            const users = await internalServices.searchUsers(q, limit, skip) || [];

            // Deduplicate matching users with post authors
            const userIds = new Set(users.map(u => (u.id || u._id).toString()));

            // Add authors of matched posts to the people list if not already there
            const additionalAuthors = [];
            for (const authorId of postAuthorIds) {
                if (!userIds.has(authorId)) {
                    try {
                        const authorProfile = await internalServices.getUserProfile(authorId);
                        if (authorProfile) additionalAuthors.push(authorProfile);
                    } catch (err) {
                        logger.error(`Failed to fetch author profile for search injection: ${err.message}`);
                    }
                }
            }

            results.users = [...additionalAuthors, ...users];
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
app.get("/api/v1/search/suggested-users", optionalAuth, async (req, res, next) => {
    try {
        let exclude = [];
        if (req.user) {
            const userId = req.user.id || req.user._id;
            exclude.push(userId.toString());

            try {
                const followingRes = await internalServices.getFollowing(userId);
                if (followingRes && Array.isArray(followingRes)) {
                    const followedIds = followingRes.map(f => (f.id || f._id).toString());
                    exclude.push(...followedIds);
                }
            } catch (followErr) {
                logger.warn(`Failed to fetch followed users for exclusion: ${followErr.message}`);
                // Continue with just self-exclusion
            }
        }

        const users = await internalServices.searchUsers("", 5, 0, exclude);
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
