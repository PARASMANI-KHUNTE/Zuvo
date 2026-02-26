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

// Domain Layer (Business Rules & Plugins)
const { authenticate, authorize } = require("./domain/auth");
const rateLimiter = require("./domain/rateLimiter");
const security = require("./domain/security");
const validator = require("./domain/validator");
const softDelete = require("./domain/softDelete");
const audit = require("./domain/audit");
const versioning = require("./domain/versioning");
const MigrationRunner = require("./domain/migrations");

// Models (Centralized Domain Objects)
const User = require("./domain/models/User");
const Post = require("./domain/models/Post");
const Message = require("./domain/models/Message");
const Conversation = require("./domain/models/Conversation");
const Comment = require("./domain/models/Comment");

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

    // Domain
    authenticate,
    authorize,
    rateLimiter,
    security,
    validator,
    softDelete,
    audit,
    versioning,
    MigrationRunner,

    // Models
    User,
    Post,
    Message,
    Conversation,
    Comment
};








