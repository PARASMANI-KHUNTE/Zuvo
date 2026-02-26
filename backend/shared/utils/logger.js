const winston = require("winston");

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: process.env.SERVICE_NAME || "unknown-service" },
    transports: [
        new winston.transports.Console()
    ]

});

// For development, use a more readable format
if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, requestId, ...meta }) => {
                const reqId = requestId ? ` [${requestId}]` : "";
                return `${timestamp} [${service}]${reqId} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
            })
        )
    }));
    // Remove the default json console transport in dev to avoid double logging
    logger.remove(logger.transports[1]);
}

module.exports = logger;
