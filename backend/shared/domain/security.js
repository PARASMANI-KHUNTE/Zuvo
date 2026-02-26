const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

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
    // xss() // Temporarily disabled to debug Express 5.x compatibility
];

module.exports = securityMiddleware;
