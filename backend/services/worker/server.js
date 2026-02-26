const dotenv = require("dotenv");
const express = require("express");
const { trace, context, propagation } = require("@opentelemetry/api");
const { logger, connectRedis, MessageBus, redisClient, connectDB, initTracing, metrics, faultInjection, HealthCheck } = require("@zuvo/shared");

dotenv.config();
process.env.SERVICE_NAME = "worker-service";

// Initialize Tracing FIRST
initTracing(process.env.SERVICE_NAME);

const tracer = trace.getTracer("worker-service");


const STREAM_NAME = "zuvo_tasks";
const GROUP_NAME = "worker_group";
const CONSUMER_NAME = `worker_${process.pid}`;

/**
 * Worker logic to process messages from the MessageBus.
 */
const startWorker = async () => {
    await connectDB();
    await connectRedis();

    // Expose a health check port
    const app = express();
    app.get("/health", async (req, res) => {
        res.status(200).json(await HealthCheck.getHealth());
    });
    app.get("/ready", async (req, res) => {
        const ready = await HealthCheck.getReady();
        res.status(ready.status === "UP" ? 200 : 503).json(ready);
    });
    const HEALTH_PORT = process.env.HEALTH_PORT || 8008;
    app.listen(HEALTH_PORT, () => {
        logger.info(`Worker health check server running on port ${HEALTH_PORT}`);
    });


    // Ensure consumer group exists
    await MessageBus.createConsumerGroup(STREAM_NAME, GROUP_NAME);

    logger.info(`Worker ${CONSUMER_NAME} started. Listening for tasks...`);

    let retryDelay = 1000;

    while (true) {
        try {
            // Read new messages from the group
            const results = await redisClient.xReadGroup(
                GROUP_NAME,
                CONSUMER_NAME,
                { key: STREAM_NAME, id: ">" },
                { COUNT: 1, BLOCK: 5000 }
            );

            // Reset delay on successful interaction with Redis
            retryDelay = 1000;

            if (results) {
                for (const stream of results) {
                    for (const message of stream.messages) {
                        const { id, message: data } = message;
                        const task = JSON.parse(data.data);
                        const traceparent = data.traceparent;

                        // 1. Idempotency Guard (SETNX with 24h TTL)
                        const lockKey = `zuvo:worker:processed:${id}`;
                        const isNew = await redisClient.set(lockKey, "1", { NX: true, EX: 86400 });

                        if (!isNew) {
                            logger.warn(`Task [${id}] already processed or in progress. Skipping.`);
                            await redisClient.xAck(STREAM_NAME, GROUP_NAME, id);
                            continue;
                        }

                        // Track retries
                        task.retries = (task.retries || 0) + 1;
                        const correlationId = task.correlationId || `req_${id}`;

                        if (task.retries > 5) {
                            logger.error(`Task [${id}] [Correlation: ${correlationId}] max retries reached. Moving to DLQ.`);
                            await handleFailure(id, task, new Error("Max retries exceeded"));
                            await redisClient.xAck(STREAM_NAME, GROUP_NAME, id);
                            continue;
                        }

                        // Extract remote context
                        const parentContext = propagation.extract(context.active(), { traceparent });

                        await context.with(parentContext, async () => {
                            await tracer.startActiveSpan(`worker.process.${task.type}`, async (span) => {
                                logger.info(`Processing task [${id}]: ${task.type}`);
                                span.setAttribute("task.id", id);
                                span.setAttribute("task.type", task.type);

                                try {
                                    const start = process.hrtime();
                                    await handleTask(task);
                                    const duration = process.hrtime(start);
                                    const durationInSeconds = duration[0] + duration[1] / 1e9;

                                    // Acknowledge the message upon success
                                    await redisClient.xAck(STREAM_NAME, GROUP_NAME, id);
                                    span.setStatus({ code: 1 }); // Ok

                                    logger.info(`Task [${id}] completed in ${durationInSeconds.toFixed(3)}s`);
                                } catch (err) {
                                    logger.error(`Task [${id}] failed. Moving to DLQ.`, err);
                                    span.recordException(err);
                                    span.setStatus({ code: 2, message: err.message }); // Error
                                    await handleFailure(id, task, err);
                                } finally {
                                    span.end();
                                }
                            });
                        });
                    }
                }
            }
        } catch (err) {
            logger.error(`Worker loop error. Retrying in ${retryDelay}ms...`, err);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            // Exponential backoff
            retryDelay = Math.min(retryDelay * 2, 30000);
        }
    }
};


const handleTask = async (task) => {
    switch (task.type) {
        case "MEDIA_COMPRESSION":
            logger.info("Compressing media in background...");
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, 2000));
            break;
        case "FEED_FANOUT":
            logger.info("Fanning out post to follower feeds...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
        case "NOTIFICATION":
            logger.info(`Sending ${task.notificationType} notification to user ${task.userId}`);
            await redisClient.publish("notifications", JSON.stringify(task));
            break;
        case "SEARCH_INDEX":
            logger.info(`Indexing post ${task.postId} for search...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            break;
        case "GDPR_DELETE_USER":
            logger.info(`GDPR: Initiating scrubbing for user ${task.userId}`);
            await MessageBus.publish("zuvo_tasks", {
                type: "GDPR_USER_DELETE",
                userId: task.userId
            });
            break;
        case "SAVE_CHAT_MESSAGE":
            logger.info(`Persisting chat message for conversation ${task.conversationId}`);
            try {
                const { models } = require("@zuvo/shared");
                const Message = models.Message();
                const Conversation = models.Conversation();

                const newMessage = await Message.create({
                    conversationId: task.conversationId,
                    sender: task.sender,
                    content: task.content,
                    attachments: task.attachments
                });

                await Conversation.findByIdAndUpdate(task.conversationId, {
                    lastMessage: newMessage._id
                });
            } catch (err) {
                logger.error("Failed to persist chat message in background", err);
                throw err;
            }
            break;
        case "EMAIL_SEND":
            logger.info(`Sending email of type ${task.type} to ${task.to}`);
            if (task.type === "VERIFICATION") {
                const { emailService } = require("@zuvo/shared");
                await emailService.sendVerificationEmail(task.to, task.data.token);
            } else if (task.type === "OTP") {
                const { emailService } = require("@zuvo/shared");
                await emailService.sendPasswordResetOTP(task.to, task.data.otp);
            }
            break;
        default:
            logger.warn(`Unknown task type: ${task.type}`);
    }
};

const handleFailure = async (id, task, error) => {
    // DLQ implementation: Push to a separate stream/list for manual review or retry
    await redisClient.lPush("zuvo_dlq", JSON.stringify({
        originalId: id,
        task,
        error: error.message,
        timestamp: Date.now()
    }));
};

startWorker().catch(err => logger.error("Fatal Worker Error", err));

// GDPR Listener for Auth Service
const startGDPRListener = async () => {
    await MessageBus.createConsumerGroup("zuvo_tasks", "auth_gdpr_group");

    while (true) {
        try {
            const results = await redisClient.xReadGroup(
                "auth_gdpr_group",
                "auth_worker",
                { key: "zuvo_tasks", id: ">" },
                { COUNT: 1, BLOCK: 5000 }
            );

            if (results) {
                for (const stream of results) {
                    for (const message of stream.messages) {
                        const { id, message: data } = message;
                        const task = JSON.parse(data.data);

                        if (task.type === "GDPR_USER_DELETE") {
                            const User = require("./src/models/User");
                            logger.info(`GDPR: Scrubbing Auth data for user ${task.userId}`);
                            await User.findByIdAndUpdate(task.userId, {
                                name: "[DELETED USER]",
                                email: `deleted_${task.userId}@gdpr.zuvo.com`,
                                password: undefined,
                                googleId: undefined,
                                refreshTokens: []
                            });
                        }
                        await redisClient.xAck("zuvo_tasks", "auth_gdpr_group", id);
                    }
                }
            }
        } catch (err) {
            logger.error("GDPR Listener Error (Auth)", err);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
};

if (process.env.SERVICE_NAME === "auth-service") {
    startGDPRListener();
}

// GDPR Listener for Blog Service
const startBlogGDPRListener = async () => {
    await MessageBus.createConsumerGroup("zuvo_tasks", "blog_gdpr_group");
    while (true) {
        try {
            const results = await redisClient.xReadGroup("blog_gdpr_group", "blog_worker", { key: "zuvo_tasks", id: ">" }, { COUNT: 1, BLOCK: 5000 });
            if (results) {
                for (const stream of results) {
                    for (const message of stream.messages) {
                        const { id, message: data } = message;
                        const task = JSON.parse(data.data);
                        if (task.type === "GDPR_USER_DELETE") {
                            const Post = require("./src/models/Post");
                            logger.info(`GDPR: Scrubbing Blog data for user ${task.userId}`);
                            await Post.updateMany({ author: task.userId }, { isDeleted: true, content: "[DELETED BY USER REQUEST]", title: "[DELETED]" });
                        }
                        await redisClient.xAck("zuvo_tasks", "blog_gdpr_group", id);
                    }
                }
            }
        } catch (err) { logger.error("GDPR Listener Error (Blog)", err); await new Promise(r => setTimeout(r, 5000)); }
    }
};

// GDPR Listener for Chat Service
const startChatGDPRListener = async () => {
    await MessageBus.createConsumerGroup("zuvo_tasks", "chat_gdpr_group");
    while (true) {
        try {
            const results = await redisClient.xReadGroup("chat_gdpr_group", "chat_worker", { key: "zuvo_tasks", id: ">" }, { COUNT: 1, BLOCK: 5000 });
            if (results) {
                for (const stream of results) {
                    for (const message of stream.messages) {
                        const { id, message: data } = message;
                        const task = JSON.parse(data.data);
                        if (task.type === "GDPR_USER_DELETE") {
                            const Message = require("./src/models/Message");
                            logger.info(`GDPR: Scrubbing Chat data for user ${task.userId}`);
                            await Message.updateMany({ sender: task.userId }, { content: "[DELETED]" });
                        }
                        await redisClient.xAck("zuvo_tasks", "chat_gdpr_group", id);
                    }
                }
            }
        } catch (err) { logger.error("GDPR Listener Error (Chat)", err); await new Promise(r => setTimeout(r, 5000)); }
    }
};

if (process.env.SERVICE_NAME === "blog-service") startBlogGDPRListener();
if (process.env.SERVICE_NAME === "chat-service") startChatGDPRListener();
