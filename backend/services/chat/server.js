const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { logger, requestTrace, connectDB, metrics, faultInjection, errorHandler, initTracing } = require("@zuvo/shared");
const chatRoutes = require("./src/routes/chat");

process.env.SERVICE_NAME = "chat-service";
initTracing(process.env.SERVICE_NAME);

const app = express();

app.use(requestTrace);
app.use(metrics.metricsMiddleware(process.env.SERVICE_NAME));
app.use(faultInjection);
app.use(express.json());

// Routes
app.use("/api/v1/chat", chatRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 8007;

const start = async () => {
    await connectDB();
    app.listen(PORT, () => {
        logger.info(`Chat service is running on port ${PORT}`);
    });
};

start().catch(err => logger.error("Chat Service Startup Failed", err));
