const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
dotenv.config();
process.env.SERVICE_NAME = "media-service";

const { connectDB, logger, requestTrace, connectRedis, initTracing } = require("@zuvo/shared");

initTracing("media-service");



const app = express();

// Middleware
app.use(requestTrace);
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes (to be implemented)
app.use("/api/v1/media", require("./src/routes/media"));

// Database/Redis Connections
connectDB();
connectRedis();

app.get("/health", (req, res) => res.status(200).json({ status: "Media service is healthy" }));

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => {
    logger.info(`Media service is running on port ${PORT}`);
});
