const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { JaegerExporter } = require("@opentelemetry/exporter-jaeger");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");
const logger = require("./logger");

/**
 * OpenTelemetry Tracing Configuration
 * Enables distributed tracing across all microservices
 */
const initTracing = (serviceName) => {
    const exporter = new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || "http://localhost:14268/api/traces"
    });

    const sdk = new NodeSDK({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            "zuvo.environment": process.env.NODE_ENV || "development"
        }),
        traceExporter: exporter,
        instrumentations: [getNodeAutoInstrumentations()]
    });

    // Start SDK
    sdk.start();
    logger.info(`Tracing initialized for ${serviceName} with Jaeger exporter`);

    // Graceful shutdown
    process.on("SIGTERM", () => {
        sdk.shutdown()
            .then(() => logger.info("Tracing terminated"))
            .catch((error) => logger.error("Error terminating tracing", error))
            .finally(() => process.exit(0));
    });

    return sdk;
};

module.exports = { initTracing };
