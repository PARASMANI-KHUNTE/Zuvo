/**
 * API Versioning Middleware
 * Handles version deprecation and backward compatibility headers
 */
const apiVersion = (version, options = {}) => {
    return (req, res, next) => {
        const requestedVersion = req.get("Accept-Version") || "v1";

        // Add version to request context
        req.apiVersion = requestedVersion;

        // Set Deprecation Headers if applicable
        if (options.deprecated) {
            res.set("Warning", `299 - "API version ${version} is deprecated and will be removed on ${options.sunsetDate}"`);
            res.set("Sunset", options.sunsetDate);
        }

        next();
    };
};

module.exports = apiVersion;
