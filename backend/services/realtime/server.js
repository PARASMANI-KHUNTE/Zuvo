const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();
process.env.SERVICE_NAME = "realtime-service";

const { redisClient, logger, connectRedis, MessageBus, initTracing, metrics, faultInjection } = require("@zuvo/shared");

initTracing("realtime-service");

const httpServer = http.createServer();
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e6 // 1 MB max message size (fix E3)
});

// ============================================================
// FIX E1 (Critical): JWT-based WebSocket Authentication
// ============================================================
io.use((socket, next) => {
    try {
        // Accept token from handshake auth OR query param (for legacy clients)
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
            logger.warn(`WebSocket connection rejected — no token provided`);
            return next(new Error("Authentication required"));
        }

        const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
        const decoded = jwt.verify(token, secret);

        // Attach verified user identity to socket
        socket.userId = decoded._id;
        socket.userRole = decoded.role;

        logger.info(`WebSocket authenticated for user ${decoded._id}`);
        next();
    } catch (err) {
        logger.warn(`WebSocket authentication failed: ${err.message}`);
        next(new Error("Invalid or expired token"));
    }
});

const startServer = async () => {
    await connectRedis();

    // Pub/Sub for scalability
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));

    io.on("connection", (socket) => {
        const userId = socket.userId; // Now comes from verified JWT, not query param

        socket.join(`user:${userId}`);
        logger.info(`User ${userId} connected to WebSocket`);

        // Chat Room Events
        socket.on("chat:join", (conversationId) => {
            socket.join(`room:${conversationId}`);
            logger.info(`User ${userId} joined room ${conversationId}`);
        });

        socket.on("chat:message", async (data) => {
            try {
                const { conversationId, content, attachments } = data;

                const messageData = {
                    conversationId,
                    sender: userId,
                    content,
                    attachments,
                    timestamp: new Date()
                };

                // 1. Emit to room for immediate feedback
                io.to(`room:${conversationId}`).emit("chat:message", messageData);

                // 2. Publish to MessageBus for persistence (Chat Service Worker)
                await MessageBus.publish("zuvo_tasks", {
                    type: "SAVE_CHAT_MESSAGE",
                    ...messageData
                });
            } catch (err) {
                logger.error(`Error processing chat:message from user ${userId}`, err);
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        socket.on("chat:typing", (data) => {
            const { conversationId, isTyping } = data;
            socket.to(`room:${conversationId}`).emit("chat:typing", {
                userId,
                isTyping
            });
        });

        socket.on("disconnect", (reason) => {
            logger.info(`User ${userId} disconnected: ${reason}`);
        });
    });

    // Listen for events from other services via Redis
    const internalSub = redisClient.duplicate();
    await internalSub.connect();

    await internalSub.subscribe("notifications", (message) => {
        try {
            const data = JSON.parse(message);
            // data = { userId, type, content }
            io.to(`user:${data.userId}`).emit("notification", data);
        } catch (err) {
            logger.error("Failed to parse notification message", err);
        }
    });

    const PORT = process.env.PORT || 8004;
    httpServer.listen(PORT, () => {
        logger.info(`Real-time service is running on port ${PORT}`);
    });
};

startServer().catch(err => {
    logger.error("Failed to start Real-time service", err);
    process.exit(1);
});
