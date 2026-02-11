const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth API",
      version: "1.0.0",
      description:
        "Authentication API with JWT, refresh token rotation, and protected routes.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        RegisterInput: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "John" },
            email: {
              type: "string",
              format: "email",
              example: "john@test.com",
            },
            password: { type: "string", example: "123456" },
          },
        },
        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@test.com",
            },
            password: { type: "string", example: "123456" },
          },
        },
        RefreshInput: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string", example: "refresh-token" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "invalid refresh token" },
            code: { type: "string", example: "INVALID_REFRESH_TOKEN" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
