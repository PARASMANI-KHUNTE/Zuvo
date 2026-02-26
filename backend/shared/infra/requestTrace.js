const { v4: uuidv4 } = require("uuid");
const { AsyncLocalStorage } = require("async_hooks");
const logger = require("./logger");

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Middleware to trace requests across microservices.
 */
const requestTrace = (req, res, next) => {
    const requestId = req.get("X-Request-ID") || uuidv4();

    // Set for downstream services/debugging
    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);

    // Run the rest of the request in a storage context
    asyncLocalStorage.run({ requestId }, () => {
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

        next();
    });
};

module.exports = { requestTrace, asyncLocalStorage };
