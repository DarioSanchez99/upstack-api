const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Upstack API',
      version: '1.0.0',
      description:
        'API monitoring SaaS backend. Manages monitors, check results, alerts, and billing.',
      contact: {
        name: 'Upstack Support',
        url: 'https://upstack.io',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Default server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from POST /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
              },
              required: ['message', 'code'],
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string', nullable: true },
            plan: { type: 'string', enum: ['FREE', 'PRO'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Monitor: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            workspaceId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
            headers: { type: 'object' },
            body: { type: 'string', nullable: true },
            intervalMins: { type: 'integer' },
            timeoutSecs: { type: 'integer' },
            expectedStatus: { type: 'integer' },
            isActive: { type: 'boolean' },
            status: { type: 'string', enum: ['UP', 'DOWN', 'DEGRADED', 'PENDING'] },
            lastChecked: { type: 'string', format: 'date-time', nullable: true },
            nextCheck: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        MonitorListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Monitor' },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        CheckResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            monitorId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['UP', 'DOWN', 'DEGRADED'] },
            statusCode: { type: 'integer', nullable: true },
            responseTimeMs: { type: 'integer', nullable: true },
            errorMessage: { type: 'string', nullable: true },
            checkedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  // Scan all route files for @swagger JSDoc comments
  apis: [
    path.join(__dirname, '../modules/*/**.routes.js'),
    path.join(__dirname, '../modules/*/**.controller.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
