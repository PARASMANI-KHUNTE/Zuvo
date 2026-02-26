const client = require("prom-client");

// Global Registry
const register = new client.Registry();

// Default Metrics
client.collectDefaultMetrics({ register });

// Custom Metrics
const httpRequestDurationMicroseconds = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in microseconds",
    labelNames: ["service", "method", "route", "code"],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const redisOperationDurationMicroseconds = new client.Histogram({
    name: "redis_operation_duration_seconds",
    help: "Duration of Redis operations in microseconds",
    labelNames: ["service", "operation", "status"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
});

const messageBusEventsTotal = new client.Counter({
    name: "zuvo_message_bus_events_total",
    help: "Total count of events published to MessageBus",
    labelNames: ["service", "stream", "type"]
});

const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total count of HTTP requests",
    labelNames: ["service", "method", "route", "code"]
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(redisOperationDurationMicroseconds);
register.registerMetric(messageBusEventsTotal);
register.registerMetric(httpRequestsTotal);

const metricsMiddleware = (serviceName) => (req, res, next) => {
    const start = process.hrtime();
    res.on("finish", () => {
        const duration = process.hrtime(start);
        const durationInSeconds = duration[0] + duration[1] / 1e9;
        const route = req.route ? req.route.path : req.path;

        httpRequestDurationMicroseconds
            .labels(serviceName, req.method, route, res.statusCode)
            .observe(durationInSeconds);

        httpRequestsTotal
            .labels(serviceName, req.method, route, res.statusCode)
            .inc();
    });
    next();
};


module.exports = {
    register,
    metricsMiddleware,
    messageBusEventsTotal,
    redisOperationDurationMicroseconds
};
