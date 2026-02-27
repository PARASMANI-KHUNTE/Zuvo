const mongoose = require("mongoose");
const { redisClient } = require("./redis");
const logger = require("./logger");

/**
 * Standardized health and readiness checks.
 */
class HealthCheck {
    static async getHealth() {
        return {
            status: "UP",
            timestamp: new Date().toISOString(),
            service: process.env.SERVICE_NAME || "unknown"
        };
    }

    static async getReady() {
        const checks = {
            mongodb: await this.checkMongoDB(),
            redis: await this.checkRedis()
        };

        const isReady = Object.values(checks).every(check => check.status === "UP");

        return {
            status: isReady ? "UP" : "DOWN",
            timestamp: new Date().toISOString(),
            service: process.env.SERVICE_NAME || "unknown",
            checks
        };
    }

    static async checkMongoDB() {
        try {
            if (mongoose.connection.readyState === 1) {
                return { status: "UP" };
            }
            return { status: "DOWN", message: "MongoDB not connected" };
        } catch (err) {
            logger.error("Health check - MongoDB error", err);
            return { status: "DOWN", message: err.message };
        }
    }

    static async checkRedis() {
        try {
            if (redisClient.isOpen) {
                // Optional: ping to be sure
                await redisClient.ping();
                return { status: "UP" };
            }
            return { status: "DOWN", message: "Redis not connected" };
        } catch (err) {
            logger.error("Health check - Redis error", err);
            return { status: "DOWN", message: err.message };
        }
    }
}

module.exports = HealthCheck;
