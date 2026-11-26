const axios = require("axios");
const logger = require("./logger");
const { redisClient } = require("./redis");
const { asyncLocalStorage } = require("./requestTrace");
const createCircuitBreaker = require("./resilience");

class InternalServiceClient {
    constructor() {
        const timeoutMs = Number(process.env.INTERNAL_HTTP_TIMEOUT) || 3000;

        // Dedicated Circuit Breakers for inter-service communication
        this._httpGetBreaker = createCircuitBreaker(
            async ({ url, requestId }) => {
                const response = await axios.get(url, {
                    headers: { "X-Request-ID": requestId },
                    timeout: timeoutMs
                });
                return response.data?.data ?? response.data;
            },
            {
                timeout: timeoutMs,
                errorThresholdPercentage: 50,
                resetTimeout: 10000
            },
            "InternalService-GET"
        );

        this._httpPostBreaker = createCircuitBreaker(
            async ({ url, body, requestId }) => {
                const response = await axios.post(url, body, {
                    headers: { "X-Request-ID": requestId },
                    timeout: timeoutMs
                });
                return response.data?.data ?? response.data;
            },
            {
                timeout: timeoutMs,
                errorThresholdPercentage: 50,
                resetTimeout: 10000
            },
            "InternalService-POST"
        );
    }

    get authBaseUrl() {
        return process.env.AUTH_INTERNAL_URL || process.env.AUTH_SERVICE_URL || "http://127.0.0.1:8010";
    }
    get blogBaseUrl() {
        return process.env.BLOG_INTERNAL_URL || "http://127.0.0.1:8001";
    }
    get interactionsBaseUrl() {
        return process.env.INTERACTIONS_INTERNAL_URL || "http://127.0.0.1:8002";
    }
    get mediaBaseUrl() {
        return process.env.MEDIA_INTERNAL_URL || "http://127.0.0.1:8003";
    }

    /**
     * Get real-time status of internal circuit breakers
     */
    getCircuitStatus() {
        return {
            getBreaker: {
                opened: this._httpGetBreaker.opened,
                halfOpen: this._httpGetBreaker.halfOpen,
                closed: this._httpGetBreaker.closed,
                stats: this._httpGetBreaker.stats
            },
            postBreaker: {
                opened: this._httpPostBreaker.opened,
                halfOpen: this._httpPostBreaker.halfOpen,
                closed: this._httpPostBreaker.closed,
                stats: this._httpPostBreaker.stats
            }
        };
    }

    async _get(url, requestId) {
        try {
            return await this._httpGetBreaker.fire({ url, requestId });
        } catch (err) {
            logger.error(`Internal call to ${url} failed [Req: ${requestId}]: ${err.message}`, {
                status: err.response?.status,
                circuitOpen: this._httpGetBreaker.opened
            });
            throw err;
        }
    }

    async _post(url, body, requestId) {
        try {
            return await this._httpPostBreaker.fire({ url, body, requestId });
        } catch (err) {
            logger.error(`Internal call to ${url} failed [Req: ${requestId}]: ${err.message}`, {
                status: err.response?.status,
                circuitOpen: this._httpPostBreaker.opened
            });
            throw err;
        }
    }

    /**
     * Fetch user profile from Auth service with Redis caching and Circuit Breaker fallback
     */
    async getUserProfile(userId) {
        const cacheKey = `user:profile:${userId}`;
        const store = asyncLocalStorage.getStore();
        const requestId = store?.requestId;

        try {
            // 1. Try Cache
            if (redisClient?.isOpen) {
                const cachedUser = await redisClient.get(cacheKey);
                if (cachedUser) return JSON.parse(cachedUser);
            }

            // 2. Internal HTTP Call protected by Circuit Breaker
            const user = await this._get(`${this.authBaseUrl}/api/v1/auth/internal/user/${userId}`, requestId);

            // 3. Set Cache (TTL 5 minutes)
            if (redisClient?.isOpen && user) {
                await redisClient.set(cacheKey, JSON.stringify(user), { EX: 300 });
            }

            return user;
        } catch (err) {
            logger.warn(`Fallback to Unknown User for ${userId}: ${err.message} [Circuit Breaker Open: ${this._httpGetBreaker.opened}]`);
            return { id: userId, name: "Unknown User", username: "unknown", avatar: null, isFallback: true };
        }
    }

    async getInternalUser(userId) {
        return this.getUserProfile(userId);
    }

    async searchUsers(query, limit = 10, skip = 0, exclude = []) {
        const store = asyncLocalStorage.getStore();
        const excludeStr = Array.isArray(exclude) ? exclude.join(",") : exclude;
        const encodedQuery = encodeURIComponent(query);
        try {
            return await this._get(`${this.authBaseUrl}/api/v1/auth/internal/users/search?q=${encodedQuery}&limit=${limit}&skip=${skip}&exclude=${excludeStr}`, store?.requestId);
        } catch (err) {
            logger.warn(`searchUsers fallback to empty list: ${err.message}`);
            return [];
        }
    }

    async getFollowing(userId) {
        const store = asyncLocalStorage.getStore();
        try {
            return await this._get(`${this.interactionsBaseUrl}/api/v1/interactions/relationships/${userId}/following`, store?.requestId);
        } catch (err) {
            logger.warn(`getFollowing fallback to empty list for ${userId}: ${err.message}`);
            return [];
        }
    }

    async getPost(postId) {
        const store = asyncLocalStorage.getStore();
        try {
            return await this._get(`${this.blogBaseUrl}/api/v1/blogs/internal/${postId}`, store?.requestId);
        } catch (err) {
            logger.warn(`getPost fallback to null for ${postId}: ${err.message}`);
            return null;
        }
    }

    /**
     * Ask the media service to pre-generate compressed derivatives of an upload.
     */
    async compressMedia(publicId, resourceType = "image", userId = null) {
        const store = asyncLocalStorage.getStore();
        try {
            return await this._post(`${this.mediaBaseUrl}/api/v1/media/internal/compress`, {
                publicId,
                resourceType,
                userId
            }, store?.requestId);
        } catch (err) {
            logger.warn(`compressMedia fallback (non-fatal): ${err.message}`);
            return { queued: false, error: err.message };
        }
    }

    /**
     * Fetch multiple user profiles from Auth service with batching, Redis caching, and circuit protection
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
            if (redisClient?.isOpen) {
                const cacheKeys = uniqueIds.map(id => `user:profile:${id}`);
                const cachedUsers = await Promise.all(cacheKeys.map(key => redisClient.get(key).catch(() => null)));

                uniqueIds.forEach((id, index) => {
                    if (cachedUsers[index]) {
                        try {
                            results[id] = JSON.parse(cachedUsers[index]);
                        } catch {
                            missingIds.push(id);
                        }
                    } else {
                        missingIds.push(id);
                    }
                });
            } else {
                missingIds.push(...uniqueIds);
            }

            // 2. Batch Internal HTTP Call for missing IDs via Circuit Breaker
            if (missingIds.length > 0) {
                try {
                    const fetchedUsers = await this._post(`${this.authBaseUrl}/api/v1/auth/internal/users`,
                        { ids: missingIds },
                        requestId
                    );

                    if (Array.isArray(fetchedUsers)) {
                        const cachePromises = fetchedUsers.map(user => {
                            const userId = (user.id || user._id).toString();
                            results[userId] = user;
                            if (redisClient?.isOpen) {
                                return redisClient.set(`user:profile:${userId}`, JSON.stringify(user), { EX: 300 }).catch(() => null);
                            }
                            return Promise.resolve();
                        });
                        await Promise.all(cachePromises);
                    }
                } catch (batchErr) {
                    logger.error(`Batch internal call to Auth failed [Circuit Breaker: ${this._httpPostBreaker.opened ? 'OPEN' : 'CLOSED'}]: ${batchErr.message}`);
                    missingIds.forEach(id => {
                        if (!results[id]) results[id] = { id, name: "Unknown User", username: "unknown", avatar: null, isFallback: true };
                    });
                }
            }

            // Return profiles in the original order
            return userIds.map(id => results[id.toString()] || { id: id.toString(), name: "Unknown User", username: "unknown", avatar: null, isFallback: true });
        } catch (err) {
            logger.error(`getUsersProfiles failed: ${err.message}`);
            return userIds.map(id => ({ id: id.toString(), name: "Unknown User", username: "unknown", avatar: null, isFallback: true }));
        }
    }
}

module.exports = new InternalServiceClient();
module.exports.InternalServiceClient = InternalServiceClient;
