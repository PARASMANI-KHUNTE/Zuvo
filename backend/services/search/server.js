const express = require("express");
const dotenv = require("dotenv");
const { logger, requestTrace, connectRedis, redisClient, initTracing, metrics, faultInjection, errorHandler } = require("@zuvo/shared");

dotenv.config();
process.env.SERVICE_NAME = "search-service";

initTracing(process.env.SERVICE_NAME);

const app = express();

app.use(requestTrace);
app.use(metrics.metricsMiddleware(process.env.SERVICE_NAME));
app.use(faultInjection);
app.use(express.json());

/**
 * @desc    Search posts/users
 * @route   GET /api/v1/search
 * @access  Public
 */
app.get("/api/v1/search", async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ success: false, message: "Search query is required" });
        }

        logger.info(`Search query received: ${q}`);

        // In a high-scale system, this would hit Meilisearch or Elasticsearch
        // For now, let's simulate a search result
        res.status(200).json({
            success: true,
            data: [
                { id: "1", title: `Result for ${q}`, type: "post" }
            ]
        });
    } catch (err) {
        next(err);
    }
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 8006;
app.listen(PORT, async () => {
    await connectRedis();
    logger.info(`Search service running on port ${PORT}`);
});
