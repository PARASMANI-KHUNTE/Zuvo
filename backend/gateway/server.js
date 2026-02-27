const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerDocs = require("./src/docs/swagger");
const contractValidator = require("./src/middleware/contractValidator");

const { logger, requestTrace, metrics, security, initTracing, versioning, faultInjection, HealthCheck, errorHandler } = require("@zuvo/shared");


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
// app.use((req, res, next) => { logger.info(`Gateway: Entering Security [${req.path}]`); next(); });
// app.use(security);

// Trace requests
// app.use((req, res, next) => { logger.info(`Gateway: Entering Versioning`); next(); });
// app.use(versioning("v1"));
app.use((req, res, next) => { logger.info(`Gateway: Entering Metrics`); next(); });
app.use(metrics.metricsMiddleware("gateway"));
// app.use((req, res, next) => { logger.info(`Gateway: Entering FaultInjection`); next(); });
// app.use(faultInjection);
// app.use((req, res, next) => { logger.info(`Gateway: Entering ContractValidator`); next(); });
// app.use(contractValidator);

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

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
const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || "http://localhost:8004";


// Route grouping
const proxyConfig = (prefix, target) => ({
    target,
    changeOrigin: true,
    pathFilter: (p) => p.startsWith(prefix),
    proxyTimeout: 10000,
    timeout: 10000,
    on: {
        proxyReq: (proxyReq, req, res) => {
            proxyReq.setHeader("X-Request-ID", req.requestId || "");
            if (req.headers.cookie) {
                const cookieNames = req.headers.cookie.split(';').map(c => c.split('=')[0].trim());
                logger.info(`ProxyReq [${prefix}]: Forwarding Cookie header with: ${cookieNames.join(', ')}`);
            }
        },
        proxyRes: (proxyRes, req, res) => {
            if (proxyRes.headers['set-cookie']) {
                logger.info(`ProxyRes [${prefix}]: Received Set-Cookie from target: ${proxyRes.headers['set-cookie']}`);
            }
        },
        error: (err, req, res) => {
            logger.error(`Proxy Error [${prefix}]: ${err.message}`);
            if (!res.headersSent) {
                res.status(502).json({
                    success: false,
                    message: "Service Unavailable",
                    error: err.message
                });
            }
        }
    }
});

app.use(createProxyMiddleware(proxyConfig("/api/v1/auth", AUTH_SERVICE_URL)));
app.use(createProxyMiddleware(proxyConfig("/api/v1/blogs", BLOG_SERVICE_URL)));
app.use(createProxyMiddleware(proxyConfig("/api/v1/media", MEDIA_SERVICE_URL)));
app.use(createProxyMiddleware(proxyConfig("/api/v1/interactions", INTERACTIONS_SERVICE_URL)));
app.use(createProxyMiddleware(proxyConfig("/api/v1/feed", FEED_SERVICE_URL)));
app.use(createProxyMiddleware(proxyConfig("/api/v1/search", SEARCH_SERVICE_URL)));
app.use(createProxyMiddleware(proxyConfig("/api/v1/chat", CHAT_SERVICE_URL)));
app.use(createProxyMiddleware(proxyConfig("/api/v1/notifications", REALTIME_SERVICE_URL)));

// WebSocket Proxy
const wsProxy = createProxyMiddleware({
    target: REALTIME_SERVICE_URL,
    ws: true,
    changeOrigin: true,
    logger: logger
});
app.use("/socket.io", wsProxy);






// Metrics endpoint for Prometheus
app.get("/metrics", async (req, res) => {
    res.set("Content-Type", metrics.register.contentType);
    res.end(await metrics.register.metrics());
});

// Health Checks
app.get("/health", async (req, res) => {
    res.status(200).json(await HealthCheck.getHealth());
});

app.get("/ready", async (req, res) => {
    const ready = await HealthCheck.getReady();
    res.status(ready.status === "UP" ? 200 : 503).json(ready);
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.GATEWAY_PORT || 5000;
server.listen(PORT, () => {
    logger.info(`API Gateway is running on port ${PORT}`);
});

// WebSocket Upgrade Handler
server.on("upgrade", (req, socket, head) => {
    wsProxy.upgrade(req, socket, head);
});

