const Stripe = require('stripe');
const prisma = require('../../config/database');
const config = require('../../config/env');

const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Get or create a Stripe Customer for the given user.
 */
const getOrCreateStripeCustomer = async (user) => {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
};

/**
 * Create a Stripe Checkout session for the PRO plan.
 */
const createCheckout = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const customerId = await getOrCreateStripeCustomer(user);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: config.STRIPE_PRO_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${config.FRONTEND_URL}/billing?success=true`,
    cancel_url: `${config.FRONTEND_URL}/billing?canceled=true`,
    metadata: { userId },
  });

  return { url: session.url };
};

/**
 * Create a Stripe Customer Portal session.
 */
const createPortal = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.stripeCustomerId) {
    const err = new Error('No billing account found. Please subscribe first.');
    err.status = 400;
    throw err;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${config.FRONTEND_URL}/billing`,
  });

  return { url: session.url };
};

/**
 * Handle Stripe webhook events.
 * Verifies the signature and updates user plan accordingly.
 */
const handleWebhook = async (rawBody, signature) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const e = new Error(`Webhook signature verification failed: ${err.message}`);
    e.status = 400;
    throw e;
  }

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'checkout.session.completed': {
      const subscription =
        event.type === 'checkout.session.completed'
          ? await stripe.subscriptions.retrieve(event.data.object.subscription)
          : event.data.object;

      const customerId = subscription.customer;
      const isActive = ['active', 'trialing'].includes(subscription.status);

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { plan: isActive ? 'PRO' : 'FREE' },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { plan: 'FREE' },
      });
      break;
    }

    default:
      // Unhandled event type — safe to ignore
      break;
  }

  return { received: true };
};

/**
 * Return the current plan for a user.
 */
const getSubscription = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, stripeCustomerId: true },
  });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return { plan: user.plan, hasStripeAccount: !!user.stripeCustomerId };
};

module.exports = { createCheckout, createPortal, handleWebhook, getSubscription };
