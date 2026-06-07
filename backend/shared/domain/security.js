const mongoSanitize = require("express-mongo-sanitize");

/**
 * Enterprise Security Hardening Middleware
 * Sanitizes inputs against NoSQL injection and XSS
 */
const securityMiddleware = [
    (req, res, next) => {
        if (req.query) mongoSanitize.sanitize(req.query);
        if (req.body) mongoSanitize.sanitize(req.body);
        if (req.params) mongoSanitize.sanitize(req.params);
        next();
    },
    (req, res, next) => {
        if (req.body) stripXSS(req.body);
        if (req.query) stripXSS(req.query);
        if (req.params) stripXSS(req.params);
        next();
    }
];

function stripXSS(obj) {
    if (typeof obj === "string") {
        return obj
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;")
            .replace(/\//g, "&#x2F;");
    }
    if (typeof obj === "object" && obj !== null) {
        for (const key of Object.keys(obj)) {
            obj[key] = stripXSS(obj[key]);
        }
    }
    return obj;
}

module.exports = securityMiddleware;
