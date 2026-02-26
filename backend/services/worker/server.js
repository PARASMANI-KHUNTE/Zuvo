const dotenv = require("dotenv");
const { trace, context, propagation } = require("@opentelemetry/api");
const { logger, connectRedis, MessageBus, redisClient, connectDB, initTracing, metrics, faultInjection } = require("@zuvo/shared");

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
            logger.info(`GDPR: Scrubbing all PII for user ${task.userId}`);
            try {
                const { models } = require("@zuvo/shared");
                const User = models.User();
                const Post = models.Post();
                const Message = models.Message();

                // 1. Anonymize User record
                await User.findByIdAndUpdate(task.userId, {
                    name: "[DELETED USER]",
                    email: `deleted_${task.userId}@gdpr.zuvo.com`,
                    password: undefined,
                    googleId: undefined,
                    verificationToken: undefined,
                    // resetPasswordOTP: undefined, // Fix key name if necessary
                    refreshTokens: []
                });

                // 2. Soft-delete and anonymize all Posts
                await Post.updateMany(
                    { author: task.userId },
                    { isDeleted: true, content: "[DELETED BY USER REQUEST]", title: "[DELETED]" }
                );

                // 3. Anonymize all Chat messages
                await Message.updateMany({ sender: task.userId }, { content: "[DELETED]" });

                logger.info(`GDPR successfully processed for user ${task.userId}`);
            } catch (err) {
                logger.error(`GDPR scrubbing failed for user ${task.userId}`, err);
                throw err;
            }
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
