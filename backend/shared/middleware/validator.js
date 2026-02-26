const Joi = require("joi");

/**
 * Validation middleware using Joi
 * @param {object} schema - Joi schema object
 * @param {string} source - req source (body, query, params)
 */
const validator = (schema, source = "body") => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).json({
                success: false,
                message: "Validation Error",
                errors: error.details.map(d => ({
                    field: d.path[0],
                    message: d.message
                }))
            });
        }

        // Replace request data with validated/sanitized value
        req[source] = value;
        next();
    };
};

module.exports = validator;
