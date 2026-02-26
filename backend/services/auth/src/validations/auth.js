const Joi = require("joi");

// FIX B8: Role removed — users cannot self-assign roles (server assigns "user" by default)
exports.registerSchema = Joi.object({
    name: Joi.string().required().min(2).max(50),
    username: Joi.string().required().alphanum().min(3).max(30),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .message("Password must contain at least one uppercase letter, one lowercase letter, and one number")
});

exports.loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});
