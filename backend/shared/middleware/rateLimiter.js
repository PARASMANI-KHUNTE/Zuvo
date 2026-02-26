const logger = require("../utils/logger");
const { redisClient } = require("../utils/redis");


/**
 * Advanced Redis-backed rate limiter.
 * @param {number} windowInSeconds - Time window
 * @param {number} maxRequests - Max requests allowed in the window
 */
const rateLimiter = (windowInSeconds, maxRequests) => {
    return async (req, res, next) => {
        const key = `ratelimit:${req.user?.id || req.ip}:${req.originalUrl}`;

        try {
            const requests = await redisClient.incr(key);

            if (requests === 1) {
                await redisClient.expire(key, windowInSeconds);
            }

            if (requests > maxRequests) {
                logger.warn(`Rate limit exceeded for ${key}`);
                return res.status(429).json({
                    success: false,
                    message: "Too many requests, please try again later"
                });
            }

            next();
        } catch (err) {
            logger.error("Rate Limiter Error", err);
            next(); // Fail open for safety in case of Redis failure
        }
    };
};

module.exports = rateLimiter;
