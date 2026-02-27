const { v4: uuidv4 } = require("uuid");
const { AsyncLocalStorage } = require("async_hooks");
const logger = require("./logger");

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Middleware to trace requests across microservices.
 */
const requestTrace = (req, res, next) => {
    const requestId = req.get("X-Request-ID") || uuidv4();

    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);

    const start = Date.now();
    logger.info(`${req.method} ${req.url} - Started`, { requestId });

    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.url} - Finished - ${res.statusCode} - ${duration}ms`, {
            requestId,
            statusCode: res.statusCode,
            duration
        });
    });

    // Use enterWith() to set the async context for the current execution context.
    // This is Express 5 compatible - unlike run() which wraps a callback,
    // enterWith() sets the store for the current async context and all its descendants.
    asyncLocalStorage.enterWith({ requestId });

    next();
};

module.exports = { requestTrace, asyncLocalStorage };
