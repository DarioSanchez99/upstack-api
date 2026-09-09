const { Router } = require('express');
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const billingService = require('./billing.service');

const router = Router();

/**
 * @swagger
 * /billing/create-checkout:
 *   post:
 *     summary: Create a Stripe Checkout session to subscribe to the PRO plan
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Checkout session URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: Redirect the user to this Stripe Checkout URL
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create-checkout', authenticate, async (req, res, next) => {
  try {
    const result = await billingService.createCheckout(req.user.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /billing/portal:
 *   post:
 *     summary: Create a Stripe Customer Portal session to manage billing
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer portal URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: Redirect the user to this Stripe Portal URL
 *       400:
 *         description: No billing account — user must subscribe first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const result = await billingService.createPortal(req.user.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /billing/webhook:
 *   post:
 *     summary: Stripe webhook endpoint (internal — do not call directly)
 *     description: >
 *       Receives Stripe events (subscription created, updated, deleted).
 *       Requires the raw request body and a valid `Stripe-Signature` header.
 *       Stripe webhook signature is verified via `stripe.webhooks.constructEvent`.
 *     tags: [Billing]
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe-generated HMAC signature
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Raw Stripe event payload
 *     responses:
 *       200:
 *         description: Event received
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid Stripe signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/billing/webhook — Stripe webhook (raw body required, NO auth middleware)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        return res.status(400).json({
          error: {
            message: 'Missing Stripe-Signature header',
            code: 'BAD_REQUEST',
          },
        });
      }

      const result = await billingService.handleWebhook(req.body, signature);
      res.json(result);
    } catch (err) {
      // Ensure webhook signature failures always return 400, not 500
      if (err.status === 400) {
        return res.status(400).json({
          error: {
            message: err.message,
            code: 'BAD_REQUEST',
          },
        });
      }
      next(err);
    }
  }
);

/**
 * @swagger
 * /billing/subscription:
 *   get:
 *     summary: Get the current billing plan for the authenticated user
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plan:
 *                   type: string
 *                   enum: [FREE, PRO]
 *                 hasStripeAccount:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const subscription = await billingService.getSubscription(req.user.userId);
    res.json(subscription);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
