const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');

/**
 * Global Express error handler.
 * Must be registered AFTER all routes as: app.use(errorHandler)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Request validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] ?? 'field';
      return res.status(409).json({
        error: 'Conflict',
        message: `A record with this ${field} already exists`,
      });
    }
    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: err.meta?.cause ?? 'Record not found',
      });
    }
  }

  // JWT errors → 401
  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    return res.status(401).json({ error: 'Unauthorized', message: err.message });
  }

  // Custom HTTP errors (thrown with err.status)
  if (err.status && err.status < 500) {
    return res.status(err.status).json({
      error: err.name ?? 'Error',
      message: err.message,
    });
  }

  // Generic server error → 500
  console.error('[errorHandler]', err);
  return res.status(500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
  });
};

module.exports = { errorHandler };
