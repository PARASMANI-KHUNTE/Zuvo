const { propagation, context } = require("@opentelemetry/api");
const { redisClient } = require("./redis");

const logger = require("./logger");
const metrics = require("./metrics");


/**
 * Generic Message Bus interface using Redis Streams.
 */
class MessageBus {
    /**
     * Publish a message to a stream.
     */
    static async publish(stream, data) {
        try {
            // Inject tracing context
            const carrier = {};
            propagation.inject(context.active(), carrier);

            const messageData = {
                data: JSON.stringify(data),
                timestamp: Date.now().toString(),
                traceparent: carrier.traceparent // OTel standard header
            };

            const messageId = await redisClient.xAdd(stream, "*", messageData, {
                TRIM: {
                    strategy: "MAXLEN",
                    threshold: 10000
                }
            });


            // Instrument
            metrics.messageBusEventsTotal.labels(stream, data.type || "unknown").inc();

            logger.info(`Message published to ${stream}: ${messageId} (trimmed)`);


            return messageId;
        } catch (err) {
            logger.error(`Failed to publish message to ${stream}`, err);
            // In a real system, we might backup to local storage or a fallback queue
            throw err;
        }
    }

    /**
     * Create a consumer group for reliable processing.
     */
    static async createConsumerGroup(stream, group) {
        try {
            await redisClient.xGroupCreate(stream, group, "0", { MKSTREAM: true });
        } catch (err) {
            if (!err.message.includes("BUSYGROUP")) {
                throw err;
            }
        }
    }
}

module.exports = MessageBus;
