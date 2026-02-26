const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const { logger, requestTrace, metrics, security, initTracing } = require("@zuvo/shared");

// Initialize Tracing FIRST
initTracing("gateway");


const http = require("http");
const { createProxyMiddleware } = require("http-proxy-middleware");

dotenv.config();

// Set service name for logger
process.env.SERVICE_NAME = "gateway";

const app = express();
const server = http.createServer(app);

// Global Security Hardening (Zero-Trust)
app.use(security);

// Trace requests
app.use(metrics.metricsMiddleware);

app.use(requestTrace);


// Security and Logging
app.use(helmet());
app.use(morgan("dev"));
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));

// Add Request ID to all outgoing proxy requests
const onProxyReq = (proxyReq, req, res) => {
    proxyReq.setHeader("X-Request-ID", req.requestId);
};


// Proxy Definitions
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8000";
const BLOG_SERVICE_URL = process.env.BLOG_SERVICE_URL || "http://localhost:8001";
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || "http://localhost:8003";
const INTERACTIONS_SERVICE_URL = process.env.INTERACTIONS_SERVICE_URL || "http://localhost:8002";
const FEED_SERVICE_URL = process.env.FEED_SERVICE_URL || "http://localhost:8005";
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || "http://localhost:8006";
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://localhost:8007";


// Route grouping
app.use("/api/v1/auth", createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    onProxyReq,
    pathRewrite: {
        "^/api/v1/auth": "/api/v1/auth"
    }
}));

app.use("/api/v1/blogs", createProxyMiddleware({
    target: BLOG_SERVICE_URL,
    changeOrigin: true,
    onProxyReq,
    pathRewrite: {
        "^/api/v1/blogs": "/api/v1/blogs"
    }
}));

app.use("/api/v1/media", createProxyMiddleware({
    target: MEDIA_SERVICE_URL,
    changeOrigin: true,
    onProxyReq,
    pathRewrite: {
        "^/api/v1/media": "/api/v1/media"
    }
}));

app.use("/api/v1/interactions", createProxyMiddleware({
    target: INTERACTIONS_SERVICE_URL,
    changeOrigin: true,
    onProxyReq,
    pathRewrite: {
        "^/api/v1/interactions": "/api/v1/interactions"
    }
}));

app.use("/api/v1/feed", createProxyMiddleware({
    target: FEED_SERVICE_URL,
    changeOrigin: true,
    onProxyReq,
    pathRewrite: {
        "^/api/v1/feed": "/api/v1/feed"
    }
}));

app.use("/api/v1/search", createProxyMiddleware({
    target: SEARCH_SERVICE_URL,
    changeOrigin: true,
    onProxyReq,
    pathRewrite: {
        "^/api/v1/search": "/api/v1/search"
    }
}));

app.use("/api/v1/chat", createProxyMiddleware({
    target: CHAT_SERVICE_URL,
    changeOrigin: true,
    onProxyReq,
    pathRewrite: {
        "^/api/v1/chat": "/api/v1/chat"
    }
}));






// Metrics endpoint for Prometheus
app.get("/metrics", async (req, res) => {
    res.set("Content-Type", metrics.register.contentType);
    res.end(await metrics.register.metrics());
});

// Health Check
app.get("/health", (req, res) => {
    res.status(200).json({ status: "Gateway is healthy" });
});

const PORT = process.env.GATEWAY_PORT || 5000;
server.listen(PORT, () => {
    logger.info(`API Gateway is running on port ${PORT}`);
});

// WebSocket Upgrade Handler
server.on("upgrade", (req, socket, head) => {
    const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || "http://localhost:8004";
    const proxy = createProxyMiddleware({
        target: REALTIME_SERVICE_URL,
        ws: true,
        changeOrigin: true
    });
    proxy.upgrade(req, socket, head);
});

