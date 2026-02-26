const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
dotenv.config();
process.env.SERVICE_NAME = "auth-service";

const { connectDB, logger, requestTrace, initTracing } = require("@zuvo/shared");

initTracing("auth-service");


const errorHandler = require("./src/middleware/errorHandler");
const authRoutes = require("./src/routes/auth");

const app = express();
app.use(requestTrace);


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
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api", limiter);

// Database Connection
connectDB();

// Routes
app.use("/api/v1/auth", authRoutes);

// Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
