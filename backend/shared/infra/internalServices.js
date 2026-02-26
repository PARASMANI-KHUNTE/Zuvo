const axios = require("axios");
const logger = require("./logger");
const { redisClient } = require("./redis");
const { asyncLocalStorage } = require("./requestTrace");

class InternalServiceClient {
    constructor() {
        this.authBaseUrl = process.env.AUTH_INTERNAL_URL || "http://localhost:8000";
        this.blogBaseUrl = process.env.BLOG_INTERNAL_URL || "http://localhost:8001";
    }

    async _get(url, requestId) {
        try {
            const response = await axios.get(url, {
                headers: { "X-Request-ID": requestId }
            });
            return response.data.data;
        } catch (err) {
            logger.error(`Internal call to ${url} failed [Req: ${requestId}]: ${err.message}`);
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
            return { id: userId, name: "Unknown User", username: "unknown" };
        }
    }

    async searchUsers(query, limit = 10, skip = 0) {
        const store = asyncLocalStorage.getStore();
        return this._get(`${this.authBaseUrl}/api/v1/auth/internal/users/search?q=${query}&limit=${limit}&skip=${skip}`, store?.requestId);
    }

    async getPost(postId) {
        const store = asyncLocalStorage.getStore();
        return this._get(`${this.blogBaseUrl}/api/v1/blogs/internal/${postId}`, store?.requestId);
    }
}

module.exports = new InternalServiceClient();
