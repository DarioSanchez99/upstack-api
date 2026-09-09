require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const swaggerSpec = require('./config/swagger');

// Route modules
const authRoutes = require('./modules/auth/auth.routes');
const monitorsRoutes = require('./modules/monitors/monitors.routes');
const checksRoutes = require('./modules/checks/checks.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const statusRoutes = require('./modules/status/status.routes');

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
// NOTE: /api/billing/webhook needs raw body — express.raw() is applied inside billing.routes.js
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ─── Swagger / OpenAPI docs ───────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorsRoutes);
app.use('/api/monitors/:id', checksRoutes);   // nested: /api/monitors/:id/results|stats
app.use('/api/billing', billingRoutes);
app.use('/api/status', statusRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
