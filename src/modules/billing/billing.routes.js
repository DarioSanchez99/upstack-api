const { Router } = require('express');
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const billingService = require('./billing.service');

const router = Router();

// POST /api/billing/create-checkout — start a Stripe Checkout session
router.post('/create-checkout', authenticate, async (req, res, next) => {
  try {
    const result = await billingService.createCheckout(req.user.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/portal — open Stripe Customer Portal
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const result = await billingService.createPortal(req.user.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook — Stripe webhook (raw body required, NO auth middleware)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const signature = req.headers['stripe-signature'];
      const result = await billingService.handleWebhook(req.body, signature);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/billing/subscription — current plan info
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const subscription = await billingService.getSubscription(req.user.userId);
    res.json(subscription);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
