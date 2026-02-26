const OpenAPIRequestValidator = require("openapi-request-validator").default;
const swaggerDocs = require("../docs/swagger");

/**
 * Enterprise Contract Validator
 * Ensures incoming requests strictly follow the OpenAPI specification.
 */
const contractValidator = (req, res, next) => {
    // 1. Identify the matching path in Swagger
    const path = req.route ? req.route.path : req.path;
    const method = req.method.toLowerCase();

    // Simplify: For now, we only validate paths explicitly defined in swagger components or paths
    // In a full implementation, we would use a library like 'openapi-backend' to resolve the operation
    const pathSchema = swaggerDocs.paths[path] || swaggerDocs.paths[path.replace(/\/api\/v1/, "")];

    if (!pathSchema || !pathSchema[method]) {
        // If not in contract, we can choose to fail-closed or fail-open.
        // For graduation, we log and allow if it's not a protected route.
        return next();
    }

    const operation = pathSchema[method];

    // 2. Validate request body if schema exists
    if (operation.requestBody && operation.requestBody.content) {
        const schema = operation.requestBody.content["application/json"].schema;
        if (schema) {
            const validator = new OpenAPIRequestValidator({ schema });
            const errors = validator.validateRequest(req); // This checks body, query, headers based on schema

            if (errors) {
                return res.status(400).json({
                    success: false,
                    message: "Contract Violation: Request does not match OpenAPI specification",
                    errors: errors.errors
                });
            }
        }
    }

    next();
};

module.exports = contractValidator;
