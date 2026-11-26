const CircuitBreaker = require("opossum");
const logger = require("./logger");

/**
 * Creates a circuit breaker for a given function (usually a service call).
 * @param {Function} action - The async function to wrap.
 * @param {Object} options - Opossum options.
 * @param {string} serviceName - Name of the protected service or operation for logging.
 */
const createCircuitBreaker = (action, options = {}, serviceName = "service") => {
    const defaultOptions = {
        timeout: 3000, // Trigger failure if function takes longer than 3 seconds
        errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
        resetTimeout: 10000, // After 10 seconds, enter half-open to test health
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10
    };

    const breaker = new CircuitBreaker(action, { ...defaultOptions, ...options });

    breaker.on("open", () => logger.warn(`[CircuitBreaker] OPEN: ${serviceName} is failing or timing out. Downstream calls protected.`));
    breaker.on("halfOpen", () => logger.info(`[CircuitBreaker] HALF-OPEN: Testing ${serviceName} health.`));
    breaker.on("close", () => logger.info(`[CircuitBreaker] CLOSED: ${serviceName} restored to healthy state.`));
    breaker.on("fallback", () => logger.warn(`[CircuitBreaker] FALLBACK executed for ${serviceName}.`));

    return breaker;
};

module.exports = createCircuitBreaker;
