const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

/**
 * Enterprise Security Hardening Middleware
 * Sanitizes inputs against NoSQL injection and XSS
 */
const securityMiddleware = [
    mongoSanitize(),
    xss()
];

module.exports = securityMiddleware;
