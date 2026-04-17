const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');
const { register, login, getMe } = require('./auth.controller');

const router = Router();

// Apply stricter rate limiter to auth endpoints
router.use(authLimiter);

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me — protected
router.get('/me', authenticate, getMe);

module.exports = router;
