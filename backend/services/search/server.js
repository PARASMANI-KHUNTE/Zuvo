const express = require("express");
const dotenv = require("dotenv");
const { logger, requestTrace, connectRedis, redisClient, initTracing } = require("@zuvo/shared");

initTracing("search-service");


dotenv.config();
process.env.SERVICE_NAME = "search-service";

const app = express();

app.use(requestTrace);
app.use(express.json());

/**
 * @desc    Search posts/users
 * @route   GET /api/v1/search
 * @access  Public
 */
app.get("/api/v1/search", async (req, res) => {
    const { q } = req.query;

    logger.info(`Search query received: ${q}`);

    // In a high-scale system, this would hit Meilisearch or Elasticsearch
    // For now, let's simulate a search result
    res.status(200).json({
        success: true,
        data: [
            { id: "1", title: `Result for ${q}`, type: "post" }
        ]
    });
});

const PORT = 8006;
app.listen(PORT, async () => {
    await connectRedis();
    logger.info(`Search service running on port ${PORT}`);
});
