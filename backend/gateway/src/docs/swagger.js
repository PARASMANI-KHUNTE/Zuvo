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
