const Redis = require("redis");
const logger = require("./logger");
const metrics = require("./metrics");


const client = Redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

client.on("error", (err) => logger.error("Redis Client Error", err));
client.on("connect", () => logger.info("Redis connected"));

const connectRedis = async () => {
    if (!client.isOpen) {
        await client.connect();
    }
};

module.exports = {
    redisClient: client,
    connectRedis
};
