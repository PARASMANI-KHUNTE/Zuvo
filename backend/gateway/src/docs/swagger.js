const swaggerJsDoc = require("swagger-jsdoc");

const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "Zuvo API Ecosystem",
            version: "1.0.0",
            description: "Production-grade distributed social platform API documentation",
            contact: {
                name: "Parasmani Khunte"
            },
            servers: [
                {
                    url: "http://localhost:5000",
                    description: "API Gateway"
                }
            ]
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            },
            schemas: {
                UserRegistration: {
                    type: "object",
                    required: ["name", "username", "email", "password"],
                    properties: {
                        name: {
                            type: "string",
                            minLength: 2,
                            maxLength: 50,
                            example: "Jane Doe"
                        },
                        username: {
                            type: "string",
                            minLength: 3,
                            maxLength: 30,
                            pattern: "^[a-zA-Z0-9]+$",
                            example: "janedoe"
                        },
                        email: {
                            type: "string",
                            format: "email",
                            example: "jane@example.com"
                        },
                        password: {
                            type: "string",
                            minLength: 8,
                            description: "Must contain at least one uppercase letter, one lowercase letter and one number",
                            example: "Str0ngPass"
                        }
                    }
                },
                UserLogin: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            example: "jane@example.com"
                        },
                        password: {
                            type: "string",
                            example: "Str0ngPass"
                        }
                    }
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: false
                        },
                        message: {
                            type: "string",
                            example: "Something went wrong"
                        }
                    }
                }
            }
        }
    },
    apis: [
        "./server.js",
        "../services/*/src/routes/*.js",
        "../services/*/server.js"
    ]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = swaggerDocs;
