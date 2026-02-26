const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
dotenv.config();
process.env.SERVICE_NAME = "auth-service";

const { connectDB, logger, requestTrace, initTracing, metrics, faultInjection, errorHandler, HealthCheck } = require("@zuvo/shared");
const passport = require("passport");
require("./src/config/passport");

initTracing("auth-service");
const authRoutes = require("./src/routes/auth");

const app = express();
app.use(requestTrace);
app.use(metrics.metricsMiddleware("auth-service"));
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
app.use(passport.initialize());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api", limiter);

// Database Connection
connectDB();

// Routes
app.use("/api/v1/auth", authRoutes);

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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    logger.info(`Auth service is running on port ${PORT}`);
});
