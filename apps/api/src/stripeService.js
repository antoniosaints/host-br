import Stripe from 'stripe';
import { httpError } from './httpError.js';
import {
  attachStripeSession,
  createPendingOrder,
  getOrderByStripeSession,
  markOrderPaid
} from './orders.js';
import { getPlan } from './plans.js';

export function createStripeClient(secretKey) {
  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-07-30.basil'
  });
}

export async function createCheckoutSession({ database, stripe, user, planId, env }) {
  if (!stripe) {
    throw httpError(
      503,
      'stripe_not_configured',
      'Configure a chave do Stripe para finalizar compras.'
    );
  }

  const plan = getPlan(database, planId);
  const order = createPendingOrder(database, user.id, plan.id);
  const appUrl = env.APP_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    client_reference_id: order.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: plan.monthlyPriceCents,
          recurring: { interval: 'month' },
          product_data: {
            name: `Hostbr ${plan.name}`,
            description: `${plan.vcpu} vCPU, ${plan.ramGb} GB RAM, ${plan.storageGb} GB NVMe`
          }
        }
      }
    ],
    metadata: {
      orderId: order.id,
      userId: user.id,
      planId: plan.id
    },
    success_url: `${appUrl}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout/cancelado?plan=${plan.id}`
  });

  attachStripeSession(database, order.id, session.id);

  return {
    orderId: order.id,
    sessionId: session.id,
    checkoutUrl: session.url
  };
}

export async function syncCheckoutSession({ database, stripe, sessionId, user }) {
  if (!stripe) {
    throw httpError(
      503,
      'stripe_not_configured',
      'Configure a chave do Stripe para finalizar compras.'
    );
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const order = getOrderByStripeSession(database, session.id);

  if (!order || order.userId !== user.id) {
    throw httpError(404, 'order_not_found', 'Compra não encontrada.');
  }

  if (session.payment_status === 'paid' || session.status === 'complete') {
    return markOrderPaid(
      database,
      order.id,
      typeof session.subscription === 'string' ? session.subscription : null
    );
  }

  return order;
}

export function handleStripeWebhook({ database, stripe, rawBody, signature, env }) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    throw httpError(
      503,
      'stripe_webhook_not_configured',
      'Configure o webhook do Stripe para receber eventos.'
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw httpError(400, 'invalid_stripe_signature', 'Assinatura do Stripe inválida.');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      markOrderPaid(
        database,
        orderId,
        typeof session.subscription === 'string' ? session.subscription : null
      );
    }
  }

  return { received: true };
}
