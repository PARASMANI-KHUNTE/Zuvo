const dotenv = require("dotenv");
const { trace, context, propagation } = require("@opentelemetry/api");
const { logger, connectRedis, MessageBus, redisClient, connectDB, initTracing } = require("@zuvo/shared");

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

                        // Extract remote context
                        const parentContext = propagation.extract(context.active(), { traceparent });

                        await context.with(parentContext, async () => {
                            await tracer.startActiveSpan(`worker.process.${task.type}`, async (span) => {
                                logger.info(`Processing task [${id}]: ${task.type}`);
                                span.setAttribute("task.id", id);
                                span.setAttribute("task.type", task.type);

                                try {
                                    await handleTask(task);
                                    // Acknowledge the message upon success
                                    await redisClient.xAck(STREAM_NAME, GROUP_NAME, id);
                                    span.setStatus({ code: 1 }); // Ok
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
                // 1. Scrub from Auth (hard delete or anonymize)
                // 2. Soft-delete all Blogs
                const Post = require("../blog/src/models/post");
                await Post.updateMany({ author: task.userId }, { isDeleted: true, content: "[DELETED BY USER REQUEST]" });

                // 3. Scrub from Chat
                const Message = require("../chat/src/models/Message");
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
                const Message = require("../chat/src/models/Message");
                const Conversation = require("../chat/src/models/Conversation");

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
