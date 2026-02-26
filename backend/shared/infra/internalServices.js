const axios = require("axios");
const logger = require("./logger");
const { redisClient } = require("./redis");
const { asyncLocalStorage } = require("./requestTrace");

class InternalServiceClient {
    constructor() {
        this.authBaseUrl = process.env.AUTH_INTERNAL_URL || "http://localhost:8000";
    }

    /**
     * Fetch user profile from Auth service with Redis caching
     */
    async getUserProfile(userId) {
        const cacheKey = `user:profile:${userId}`;
        const store = asyncLocalStorage.getStore();
        const requestId = store ? store.get("requestId") : null;

        try {
            // 1. Try Cache
            const cachedUser = await redisClient.get(cacheKey);
            if (cachedUser) return JSON.parse(cachedUser);

            // 2. Internal HTTP Call with Correlation ID
            const response = await axios.get(`${this.authBaseUrl}/api/v1/auth/internal/user/${userId}`, {
                headers: {
                    "X-Request-ID": requestId
                }
            });
            const user = response.data.data;

            // 3. Set Cache (TTL 5 minutes)
            await redisClient.set(cacheKey, JSON.stringify(user), { EX: 300 });

            return user;
        } catch (err) {
            logger.error(`Internal auth call failed for user ${userId} [Req: ${requestId}]: ${err.message}`);
            return { id: userId, name: "Unknown User", username: "unknown" };
        }
    }
}

module.exports = new InternalServiceClient();
