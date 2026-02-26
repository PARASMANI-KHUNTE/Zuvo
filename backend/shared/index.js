const connectDB = require("./configs/database");
const logger = require("./utils/logger");
const { redisClient, connectRedis } = require("./utils/redis");
const createCircuitBreaker = require("./utils/resilience");
const MessageBus = require("./utils/messageBus");
const metrics = require("./utils/metrics");

// Middlewares
const { authenticate, authorize } = require("./middleware/auth");
const asyncHandler = require("./middleware/asyncHandler");
const { requestTrace, asyncLocalStorage } = require("./middleware/requestTrace");
const rateLimiter = require("./middleware/rateLimiter");
const security = require("./middleware/security");
const validator = require("./middleware/validator");
const softDelete = require("./utils/softDelete");
const audit = require("./utils/audit");
const versioning = require("./middleware/versioning");
const { initTracing } = require("./utils/tracing");


module.exports = {
    connectDB,
    authenticate,
    authorize,
    asyncHandler,
    logger,
    redisClient,
    connectRedis,
    createCircuitBreaker,
    requestTrace,
    asyncLocalStorage,
    rateLimiter,
    MessageBus,
    metrics,
    security,
    validator,
    softDelete,
    audit,
    initTracing,
    MigrationRunner: require("./utils/migrations")
};







