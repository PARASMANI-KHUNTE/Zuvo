const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
dotenv.config();
process.env.SERVICE_NAME = "interaction-service";

const { connectDB, logger, requestTrace, connectRedis, initTracing } = require("@zuvo/shared");

initTracing("interaction-service");


const app = express();

// Middleware
app.use(requestTrace);

app.use(helmet());
app.use(cors());
app.use(express.json());

// Database Connections
connectDB();
connectRedis();

app.get("/health", (req, res) => res.status(200).json({ status: "Interactions service is healthy" }));

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
    logger.info(`Interaction service is running on port ${PORT}`);
});
