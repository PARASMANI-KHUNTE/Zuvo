const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
dotenv.config();
process.env.SERVICE_NAME = "blog-service";

const { connectDB, logger, requestTrace, initTracing, metrics, faultInjection, errorHandler, HealthCheck } = require("@zuvo/shared");

initTracing("blog-service");


const blogRoutes = require("./src/routes/blog");

const app = express();
app.use(requestTrace);
app.use(metrics.metricsMiddleware("blog-service"));
app.use(faultInjection);


// Security Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api", limiter);


// Database Connection
connectDB();
const { connectRedis } = require("@zuvo/shared");
connectRedis();


// Routes
app.use("/api/v1/blogs", blogRoutes);

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

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
    logger.info(`Blog service is running on port ${PORT}`);
});
