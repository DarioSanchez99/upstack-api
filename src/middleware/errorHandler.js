const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');

/**
 * Build a consistent error response body.
 * Shape: { error: { message, code } }
 */
const buildError = (message, code) => ({ error: { message, code } });

/**
 * 404 handler for unknown routes.
 * Must be registered AFTER all routes and BEFORE the global error handler.
 */
const notFoundHandler = (req, res) => {
  res
    .status(404)
    .json(buildError(`Route ${req.method} ${req.path} not found`, 'NOT_FOUND'));
};

/**
 * Global Express error handler.
 * Must be registered AFTER all routes as: app.use(errorHandler)
 * All responses follow the shape: { error: { message, code } }
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] ?? 'field';
      return res.status(409).json(
        buildError(`A record with this ${field} already exists`, 'CONFLICT')
      );
    }
    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json(
        buildError(err.meta?.cause ?? 'Record not found', 'NOT_FOUND')
      );
    }
  }

  // JWT errors → 401
  if (err instanceof JsonWebTokenError) {
    return res.status(401).json(buildError('Invalid token', 'UNAUTHORIZED'));
  }
  if (err instanceof TokenExpiredError) {
    return res.status(401).json(buildError('Token has expired', 'TOKEN_EXPIRED'));
  }

  // Custom HTTP errors (thrown with err.status)
  if (err.status && err.status < 500) {
    // Derive a code from the status when not explicitly provided
    const code = err.code ?? httpStatusToCode(err.status);
    return res.status(err.status).json(buildError(err.message, code));
  }

  // Generic server error → 500
  console.error('[errorHandler]', err);
  return res.status(500).json(
    buildError(
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      'INTERNAL_SERVER_ERROR'
    )
  );
};

/** Map common HTTP status codes to string codes. */
const httpStatusToCode = (status) => {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
  };
  return map[status] ?? 'ERROR';
};

/**
 * Wraps an async Express route handler so that any rejected promise is
 * automatically forwarded to next(err), avoiding unhandled rejections.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, notFoundHandler, asyncHandler };
