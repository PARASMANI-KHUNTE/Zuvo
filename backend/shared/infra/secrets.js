const logger = require("./logger");

/**
 * Enterprise Secret Manager
 * Provider-agnostic interface for fetching sensitive configuration.
 */
class SecretManager {
    constructor(provider = "env") {
        this.provider = provider;
        this.cache = new Map();
    }

    /**
     * Get a secret by key.
     * Supports caching to reduce external provider calls.
     */
    async getSecret(key, defaultValue = null) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        let value;

        switch (this.provider) {
            case "vault":
                // Placeholder for HashiCorp Vault integration
                // value = await vaultClient.read(key);
                logger.warn(`Vault provider requested for ${key} but not implemented. Falling back to ENV.`);
                value = process.env[key];
                break;
            case "env":
            default:
                value = process.env[key];
                break;
        }

        const finalValue = value || defaultValue;

        if (finalValue) {
            this.cache.set(key, finalValue);
        }

        return finalValue;
    }

    /**
     * Flush the cache (useful for secret rotation).
     */
    flushCache() {
        this.cache.clear();
        logger.info("Secret manager cache flushed.");
    }
}

// Singleton instance
const secrets = new SecretManager(process.env.SECRET_PROVIDER || "env");

module.exports = secrets;
