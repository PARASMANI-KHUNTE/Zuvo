const logger = require("./logger");

/**
 * Chaos Engineering Middleware: Fault Injection
 * Safely injects latency or failures based on headers.
 * ONLY ENABLED IN NON-PRODUCTION ENVIRONMENTS.
 */
const faultInjection = (req, res, next) => {
    // Safety check: Never run in production
    if (process.env.NODE_ENV === "production") {
        return next();
    }

    const latency = req.header("x-chaos-latency"); // in ms
    const failureRate = req.header("x-chaos-failure-rate"); // 0 to 100

    // Inject Latency
    if (latency) {
        const delay = parseInt(latency);
        if (!isNaN(delay)) {
            logger.warn(`Chaos: Injecting ${delay}ms latency`);
            return setTimeout(next, delay);
        }
    }

    // Inject Failure
    if (failureRate) {
        const rate = parseInt(failureRate);
        if (!isNaN(rate) && Math.random() * 100 < rate) {
            logger.error("Chaos: Injecting failure (HTTP 503)");
            return res.status(503).json({
                success: false,
                message: "Chaos Engineering: Injected Service Unavailable"
            });
        }
    }

    next();
};

module.exports = faultInjection;
