const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");

dotenv.config();
process.env.SERVICE_NAME = "interaction-service";

const { connectDB, logger, requestTrace, connectRedis, initTracing, metrics, faultInjection, errorHandler, HealthCheck } = require("@zuvo/shared");

initTracing(process.env.SERVICE_NAME);

const interactionRoutes = require("./src/routes/interactions");

const app = express();

// Middleware
app.use(requestTrace);
app.use(metrics.metricsMiddleware(process.env.SERVICE_NAME));
app.use(faultInjection);

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());

// Routes
app.use("/api/v1/interactions", interactionRoutes);

// Health Checks
app.get("/health", async (req, res) => {
    res.status(200).json(await HealthCheck.getHealth());
});

app.get("/ready", async (req, res) => {
    const ready = await HealthCheck.getReady();
    res.status(ready.status === "UP" ? 200 : 503).json(ready);
});

// Error Handling
app.use(errorHandler);

// Database Connections
connectDB();
connectRedis();

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
    logger.info(`Interaction service is running on port ${PORT}`);
});
