const http = require("http");
const express = require("express");
const compression = require("compression");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { ObjectId } = require("mongodb");

dotenv.config();
process.env.SERVICE_NAME = "realtime-service";

const { redisClient, logger, connectRedis, MessageBus, initTracing, metrics, faultInjection, HealthCheck } = require("@zuvo/shared");

initTracing("realtime-service");

const app = express();
const httpServer = http.createServer(app);

// Standard health endpoints
app.get("/health", async (req, res) => {
    res.status(200).json(await HealthCheck.getHealth());
});

app.get("/ready", async (req, res) => {
    const ready = await HealthCheck.getReady();
    res.status(ready.status === "UP" ? 200 : 503).json(ready);
});

const { models, authenticate, connectDB: dbConnect, internalServices } = require("@zuvo/shared");
const Notification = models.Notification();
const User = models.User();
const DEFAULT_NOTIFICATION_PREFERENCES = {
    email: true,
    push: true,
    in_app: true,
    dm: true
};

app.use(compression());
app.use(express.json());

/**
 * @desc Get current user's notification preferences
 * @route GET /api/v1/notifications/preferences
 */
app.get("/api/v1/notifications/preferences", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id).select("notificationPreferences");
        const preferences = {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...(user?.notificationPreferences?.toObject?.() || user?.notificationPreferences || {})
        };
        res.status(200).json({ success: true, data: preferences });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @desc Update current user's notification preferences
 * @route PUT /api/v1/notifications/preferences
 */
app.put("/api/v1/notifications/preferences", authenticate, async (req, res) => {
    try {
        const updates = {};
        for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFERENCES)) {
            if (typeof req.body[key] === "boolean") {
                updates[`notificationPreferences.${key}`] = req.body[key];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: "No valid preferences provided" });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id || req.user.id,
            { $set: updates },
            { new: true }
        ).select("notificationPreferences");

        res.status(200).json({
            success: true,
            data: {
                ...DEFAULT_NOTIFICATION_PREFERENCES,
                ...(user?.notificationPreferences?.toObject?.() || user?.notificationPreferences || {})
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @desc Get user's notifications
 * @route GET /api/v1/notifications
 */
app.get("/api/v1/notifications", authenticate, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        const data = notifications.map(n => {
            const obj = n.toObject();
            obj.type = (obj.type || "system").toUpperCase();
            obj.isRead = obj.read; // normalize for frontend
            return obj;
        });

        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @desc Mark notification as read
 * @route PUT /api/v1/notifications/:id/read
 */
app.put("/api/v1/notifications/:id/read", authenticate, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id || req.user.id },
            { read: true }
        );
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @desc Mark all notifications as read
 * @route PUT /api/v1/notifications/read-all
 */
app.put("/api/v1/notifications/read-all", authenticate, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id || req.user.id, read: false },
            { read: true }
        );
        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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
        socket.userId = decoded.id || decoded._id;
        socket.userRole = decoded.role;

        logger.info(`WebSocket authenticated for user ${decoded._id}`);
        next();
    } catch (err) {
        logger.warn(`WebSocket authentication failed: ${err.message}`);
        next(new Error("Invalid or expired token"));
    }
});

const startServer = async () => {
    await dbConnect();
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
                    _id: new ObjectId().toString(),
                    conversationId,
                    sender: userId,
                    content,
                    attachments,
                    createdAt: new Date().toISOString()
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
            const normalizedType = (data.type || data.notificationType || "system").toUpperCase();
            data.type = normalizedType;
            data.notificationType = normalizedType;

            logger.info(`Relaying notification to user ${data.userId} via Socket.io: ${normalizedType}`);
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
