const express = require("express");
const dotenv = require("dotenv");
const { logger, requestTrace, connectRedis, redisClient, initTracing } = require("@zuvo/shared");

initTracing("feed-service");


dotenv.config();
process.env.SERVICE_NAME = "feed-service";

const app = express();

app.use(requestTrace);
app.use(express.json());

/**
 * @desc    Get personalized feed for a user
 * @route   GET /api/v1/feed
 * @access  Private
 */
app.get("/api/v1/feed", async (req, res) => {
    const userId = req.user?.id || "guest";

    // In a high-scale system, this would hit a pre-computed Redis list
    const cachedFeed = await redisClient.lRange(`user:${userId}:feed`, 0, 50);

    res.status(200).json({
        success: true,
        data: cachedFeed.map(item => JSON.parse(item))
    });
});

const PORT = 8005;
app.listen(PORT, async () => {
    await connectRedis();
    logger.info(`Feed service running on port ${PORT}`);
});
