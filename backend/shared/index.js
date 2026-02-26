// Infrastructure Layer (Core Utilities)
const connectDB = require("./infra/database");
const logger = require("./infra/logger");
const { redisClient, connectRedis } = require("./infra/redis");
const createCircuitBreaker = require("./infra/resilience");
const MessageBus = require("./infra/messageBus");
const metrics = require("./infra/metrics");
const asyncHandler = require("./infra/asyncHandler");
const { requestTrace, asyncLocalStorage } = require("./infra/requestTrace");
const { initTracing } = require("./infra/tracing");
const secrets = require("./infra/secrets");
const faultInjection = require("./infra/faultInjection");
const errorHandler = require("./infra/errorHandler");
const emailService = require("./infra/email");
const internalServices = require("./infra/internalServices");
const HealthCheck = require("./infra/health");

// Domain Layer (Business Rules & Plugins)
const { authenticate, authorize } = require("./domain/auth");
const rateLimiter = require("./domain/rateLimiter");
const security = require("./domain/security");
const validator = require("./domain/validator");
const softDelete = require("./domain/softDelete");
const audit = require("./domain/audit");
const versioning = require("./domain/versioning");
const MigrationRunner = require("./domain/migrations");

module.exports = {
    // Infra
    connectDB,
    logger,
    redisClient,
    connectRedis,
    createCircuitBreaker,
    MessageBus,
    metrics,
    asyncHandler,
    requestTrace,
    asyncLocalStorage,
    initTracing,
    secrets,
    faultInjection,
    errorHandler,
    emailService,
    internalServices,
    HealthCheck,

    // Domain
    authenticate,
    authorize,
    rateLimiter,
    security,
    validator,
    softDelete,
    audit,
    versioning,
    MigrationRunner
};
