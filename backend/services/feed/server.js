const express = require("express");
const dotenv = require("dotenv");
const { logger, requestTrace, connectRedis, redisClient, initTracing, metrics, faultInjection, errorHandler, authenticate } = require("@zuvo/shared");

dotenv.config();
process.env.SERVICE_NAME = "feed-service";

initTracing(process.env.SERVICE_NAME);

const app = express();

app.use(requestTrace);
app.use(metrics.metricsMiddleware(process.env.SERVICE_NAME));
app.use(faultInjection);
app.use(express.json());

/**
 * @desc    Get personalized feed for a user
 * @route   GET /api/v1/feed
 * @access  Private
 */
app.get("/api/v1/feed", authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;

        // In a high-scale system, this would hit a pre-computed Redis list
        const cachedFeed = await redisClient.lRange(`user:${userId}:feed`, 0, 50);

        res.status(200).json({
            success: true,
            data: cachedFeed.map(item => JSON.parse(item))
        });
    } catch (err) {
        next(err);
    }
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 8005;
app.listen(PORT, async () => {
    await connectRedis();
    logger.info(`Feed service running on port ${PORT}`);
});
