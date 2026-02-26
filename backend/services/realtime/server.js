const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { redisClient, logger, connectRedis, initTracing } = require("@zuvo/shared");

initTracing("realtime-service");


const dotenv = require("dotenv");

dotenv.config();
process.env.SERVICE_NAME = "realtime-service";

const httpServer = http.createServer();
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
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
        const userId = socket.handshake.query.userId;
        if (userId) {
            socket.join(`user:${userId}`);
            logger.info(`User ${userId} connected to WebSocket`);
        }

        // Chat Room Events
        socket.on("chat:join", (conversationId) => {
            socket.join(`room:${conversationId}`);
            logger.info(`User ${userId} joined room ${conversationId}`);
        });

        socket.on("chat:message", async (data) => {
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
            const { MessageBus } = require("@zuvo/shared");
            await MessageBus.publish("zuvo_tasks", {
                type: "SAVE_CHAT_MESSAGE",
                ...messageData
            });
        });

        socket.on("chat:typing", (data) => {
            const { conversationId, isTyping } = data;
            socket.to(`room:${conversationId}`).emit("chat:typing", {
                userId,
                isTyping
            });
        });

        socket.on("disconnect", () => {
            logger.info(`User ${userId} disconnected`);
        });
    });


    // Listen for events from other services via Redis
    const internalSub = redisClient.duplicate();
    await internalSub.connect();

    await internalSub.subscribe("notifications", (message) => {
        const data = JSON.parse(message);
        // data = { userId, type, content }
        io.to(`user:${data.userId}`).emit("notification", data);
    });

    const PORT = process.env.REALTIME_PORT || 8004;
    httpServer.listen(PORT, () => {
        logger.info(`Real-time service is running on port ${PORT}`);
    });
};

startServer().catch(err => {
    logger.error("Failed to start Real-time service", err);
});
