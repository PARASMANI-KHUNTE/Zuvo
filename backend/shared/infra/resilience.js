const CircuitBreaker = require("opossum");
const logger = require("./logger");

/**
 * Creates a circuit breaker for a given function (usually a service call).
 * @param {Function} action - The async function to wrap.
 * @param {Object} options - Opossum options.
 */
const createCircuitBreaker = (action, options = {}) => {
    const defaultOptions = {
        timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
        errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
        resetTimeout: 30000 // After 30 seconds, try again.
    };

    const breaker = new CircuitBreaker(action, { ...defaultOptions, ...options });

    breaker.on("open", () => logger.warn("Circuit Breaker OPEN: Service call failing."));
    breaker.on("halfOpen", () => logger.info("Circuit Breaker HALF-OPEN: Testing service health."));
    breaker.on("close", () => logger.info("Circuit Breaker CLOSED: Service restored."));

    return breaker;
};

module.exports = createCircuitBreaker;
