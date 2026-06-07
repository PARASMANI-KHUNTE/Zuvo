const express = require("express");
const compression = require("compression");
const dotenv = require("dotenv");
const { logger, requestTrace, connectRedis, redisClient, connectDB, initTracing, metrics, faultInjection, errorHandler, authenticate, internalServices, models, HealthCheck } = require("@zuvo/shared");

dotenv.config();
process.env.SERVICE_NAME = "feed-service";

initTracing(process.env.SERVICE_NAME);

const Post = models.Post();
const HiddenPost = models.HiddenPost();

const app = express();

app.use(requestTrace);
app.use(metrics.metricsMiddleware(process.env.SERVICE_NAME));
app.use(faultInjection);
app.use(compression());
app.use(express.json());

/**
 * @desc    Get personalized feed for a user
 * @route   GET /api/v1/feed
 * @access  Private
 */
app.get("/api/v1/feed", authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Try pre-computed Redis feed first
        const cachedFeed = await redisClient.lRange(`user:${userId}:feed`, 0, 50);

        if (cachedFeed && cachedFeed.length > 0) {
            const items = cachedFeed.map(item => JSON.parse(item));
            const paginated = items.slice(skip, skip + limit);
            return res.status(200).json({
                success: true,
                data: paginated,
                page,
                limit
            });
        }

        // Fallback to DB: fetch posts from followed users
        // Get users the current user follows
        let followingIds = [];
        try {
            const followingRes = await internalServices.getFollowing(userId);
            if (followingRes && Array.isArray(followingRes)) {
                followingIds = followingRes.map(f => (f.id || f._id).toString());
            }
        } catch (err) {
            logger.warn(`Failed to fetch following list: ${err.message}`);
        }

        // Always include own posts
        followingIds.push(userId.toString());

        // Get hidden posts for filtering
        const hiddenRecords = await HiddenPost.find({ user: userId }).select("post");
        const hiddenPostIds = hiddenRecords.map(h => h.post.toString());

        // Fetch posts with filtering
        const filter = {
            author: { $in: followingIds },
            status: "published",
            isDeleted: { $ne: true }
        };
        if (hiddenPostIds.length > 0) {
            filter._id = { $nin: hiddenPostIds };
        }

        const total = await Post.countDocuments(filter);

        const posts = await Post.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Enrich with author profiles
        const postsWithAuthors = await Promise.all(posts.map(async (post) => {
            const postObj = post.toObject();
            postObj.author = await internalServices.getUserProfile(post.author);
            return postObj;
        }));

        res.status(200).json({
            success: true,
            count: posts.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: postsWithAuthors
        });
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

const PORT = process.env.PORT || 8005;
app.listen(PORT, async () => {
    await connectDB();
    await connectRedis();
    logger.info(`Feed service running on port ${PORT}`);
});
