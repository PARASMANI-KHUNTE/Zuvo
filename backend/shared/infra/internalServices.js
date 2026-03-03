const axios = require("axios");
const logger = require("./logger");
const { redisClient } = require("./redis");
const { asyncLocalStorage } = require("./requestTrace");

class InternalServiceClient {
    constructor() {
        this.authBaseUrl = process.env.AUTH_INTERNAL_URL || "http://127.0.0.1:8000";
        this.blogBaseUrl = process.env.BLOG_INTERNAL_URL || "http://127.0.0.1:8001";
    }

    async _get(url, requestId) {
        try {
            const response = await axios.get(url, {
                headers: { "X-Request-ID": requestId },
                timeout: Number(process.env.INTERNAL_HTTP_TIMEOUT) || 5000
            });
            return response.data.data;
        } catch (err) {
            logger.error(`Internal call to ${url} failed [Req: ${requestId}]: ${err.message}`, {
                status: err.response?.status,
                data: err.response?.data
            });
            throw err;
        }
    }

    /**
     * Fetch user profile from Auth service with Redis caching
     */
    async getUserProfile(userId) {
        const cacheKey = `user:profile:${userId}`;
        const store = asyncLocalStorage.getStore();
        const requestId = store?.requestId;

        try {
            // 1. Try Cache
            const cachedUser = await redisClient.get(cacheKey);
            if (cachedUser) return JSON.parse(cachedUser);

            // 2. Internal HTTP Call
            const user = await this._get(`${this.authBaseUrl}/api/v1/auth/internal/user/${userId}`, requestId);

            // 3. Set Cache (TTL 5 minutes)
            await redisClient.set(cacheKey, JSON.stringify(user), { EX: 300 });

            return user;
        } catch (err) {
            logger.warn(`Fallback to Unknown User for ${userId}: ${err.message}`);
            return { id: userId, name: "Unknown User", username: "unknown" };
        }
    }

    async getInternalUser(userId) {
        return this.getUserProfile(userId);
    }

    async searchUsers(query, limit = 10, skip = 0) {
        const store = asyncLocalStorage.getStore();
        return this._get(`${this.authBaseUrl}/api/v1/auth/internal/users/search?q=${query}&limit=${limit}&skip=${skip}`, store?.requestId);
    }

    async getPost(postId) {
        const store = asyncLocalStorage.getStore();
        return this._get(`${this.blogBaseUrl}/api/v1/blogs/internal/${postId}`, store?.requestId);
    }

    /**
     * Fetch multiple user profiles from Auth service with batching and Redis caching
     * Optimized to avoid N+1 issues
     */
    async getUsersProfiles(userIds) {
        if (!userIds || userIds.length === 0) return [];
        const uniqueIds = [...new Set(userIds.map(id => id.toString()))];
        const store = asyncLocalStorage.getStore();
        const requestId = store?.requestId;

        try {
            const results = {};
            const missingIds = [];

            // 1. Check Cache for each ID
            const cacheKeys = uniqueIds.map(id => `user:profile:${id}`);
            const cachedUsers = await Promise.all(cacheKeys.map(key => redisClient.get(key)));

            uniqueIds.forEach((id, index) => {
                if (cachedUsers[index]) {
                    results[id] = JSON.parse(cachedUsers[index]);
                } else {
                    missingIds.push(id);
                }
            });

            // 2. Batch Internal HTTP Call for missing IDs
            if (missingIds.length > 0) {
                try {
                    const response = await axios.post(`${this.authBaseUrl}/api/v1/auth/internal/users`,
                        { ids: missingIds },
                        {
                            headers: { "X-Request-ID": requestId },
                            timeout: Number(process.env.INTERNAL_HTTP_TIMEOUT) || 5000
                        }
                    );

                    const fetchedUsers = response.data.data;

                    // 3. Set Cache and update results
                    const cachePromises = fetchedUsers.map(user => {
                        const userId = (user.id || user._id).toString();
                        results[userId] = user;
                        return redisClient.set(`user:profile:${userId}`, JSON.stringify(user), { EX: 300 });
                    });

                    await Promise.all(cachePromises);
                } catch (batchErr) {
                    logger.error(`Batch internal call to Auth failed: ${batchErr.message}`);
                    // Fallback individual IDs to Unknown if batch fails
                    missingIds.forEach(id => {
                        if (!results[id]) results[id] = { id, name: "Unknown User", username: "unknown" };
                    });
                }
            }

            // Return profiles in the original order (with duplicates if they existed in input)
            return userIds.map(id => results[id.toString()] || { id: id.toString(), name: "Unknown User", username: "unknown" });
        } catch (err) {
            logger.error(`getUsersProfiles failed: ${err.message}`);
            return userIds.map(id => ({ id: id.toString(), name: "Unknown User", username: "unknown" }));
        }
    }
}

module.exports = new InternalServiceClient();
