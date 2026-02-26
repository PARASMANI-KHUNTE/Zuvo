const logger = require("../infra/logger");
const { redisClient } = require("../infra/redis");

/**
 * Advanced Redis-backed rate limiter.
 * FIX J3: Uses Lua script for atomic INCR + EXPIRE — prevents race condition
 * where window could be reset on high-concurrency requests.
 * @param {number} windowInSeconds - Time window
 * @param {number} maxRequests - Max requests allowed in the window
 */

// Lua script: atomically increments counter and sets expiry only on first call
const rateLimitLua = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local current = redis.call("INCR", key)
if current == 1 then
    redis.call("EXPIRE", key, window)
end
return current
`;

const rateLimiter = (windowInSeconds, maxRequests) => {
    return async (req, res, next) => {
        const key = `ratelimit:${req.user?.id || req.ip}:${req.originalUrl}`;

        try {
            // Atomic INCR + conditional EXPIRE via Lua script
            const requests = await redisClient.eval(rateLimitLua, {
                keys: [key],
                arguments: [windowInSeconds.toString()]
            });

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
            next(); // Fail open for availability in case of Redis failure
        }
    };
};

module.exports = rateLimiter;
