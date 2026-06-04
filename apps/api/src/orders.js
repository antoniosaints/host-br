import { randomUUID } from 'node:crypto';
import { getPlan } from './plans.js';

export function createPendingOrder(database, userId, planId) {
  const plan = getPlan(database, planId);
  const orderId = randomUUID();
  const now = new Date().toISOString();

  database
    .prepare(
      `
      INSERT INTO orders (
        id,
        user_id,
        plan_id,
        status,
        amount_cents,
        currency,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 'checkout_pending', ?, ?, ?, ?)
    `
    )
    .run(orderId, userId, plan.id, plan.monthlyPriceCents, plan.currency, now, now);

  return getOrderById(database, orderId);
}

export function attachStripeSession(database, orderId, stripeSessionId) {
  const now = new Date().toISOString();

  database
    .prepare(
      `
      UPDATE orders
      SET stripe_session_id = ?, updated_at = ?
      WHERE id = ?
    `
    )
    .run(stripeSessionId, now, orderId);

  return getOrderById(database, orderId);
}

export function markOrderPaid(database, orderId, stripeSubscriptionId = null) {
  const now = new Date().toISOString();

  database
    .prepare(
      `
      UPDATE orders
      SET status = 'paid',
          stripe_subscription_id = COALESCE(?, stripe_subscription_id),
          paid_at = COALESCE(paid_at, ?),
          updated_at = ?
      WHERE id = ?
    `
    )
    .run(stripeSubscriptionId, now, now, orderId);

  return getOrderById(database, orderId);
}

export function getOrderById(database, orderId) {
  const row = database
    .prepare(
      `
      SELECT
        orders.id,
        orders.user_id AS userId,
        orders.plan_id AS planId,
        plans.name AS planName,
        orders.status,
        orders.amount_cents AS amountCents,
        orders.currency,
        orders.stripe_session_id AS stripeSessionId,
        orders.stripe_subscription_id AS stripeSubscriptionId,
        orders.created_at AS createdAt,
        orders.updated_at AS updatedAt,
        orders.paid_at AS paidAt
      FROM orders
      INNER JOIN plans ON plans.id = orders.plan_id
      WHERE orders.id = ?
    `
    )
    .get(orderId);

  return row ? formatOrder(row) : null;
}

export function getOrderByStripeSession(database, stripeSessionId) {
  const row = database
    .prepare(
      `
      SELECT
        orders.id,
        orders.user_id AS userId,
        orders.plan_id AS planId,
        plans.name AS planName,
        orders.status,
        orders.amount_cents AS amountCents,
        orders.currency,
        orders.stripe_session_id AS stripeSessionId,
        orders.stripe_subscription_id AS stripeSubscriptionId,
        orders.created_at AS createdAt,
        orders.updated_at AS updatedAt,
        orders.paid_at AS paidAt
      FROM orders
      INNER JOIN plans ON plans.id = orders.plan_id
      WHERE orders.stripe_session_id = ?
    `
    )
    .get(stripeSessionId);

  return row ? formatOrder(row) : null;
}

export function listOrdersForUser(database, userId, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 50);
  const cursor = options.cursor ? String(options.cursor) : null;
  const rows = cursor
    ? database
        .prepare(orderListSql('AND orders.created_at < ?'))
        .all(userId, cursor, limit + 1)
    : database.prepare(orderListSql('')).all(userId, limit + 1);

  const items = rows.slice(0, limit).map(formatOrder);
  const nextCursor = rows.length > limit ? items.at(-1).createdAt : null;

  return { items, nextCursor };
}

function orderListSql(cursorWhere) {
  return `
    SELECT
      orders.id,
      orders.user_id AS userId,
      orders.plan_id AS planId,
      plans.name AS planName,
      orders.status,
      orders.amount_cents AS amountCents,
      orders.currency,
      orders.stripe_session_id AS stripeSessionId,
      orders.stripe_subscription_id AS stripeSubscriptionId,
      orders.created_at AS createdAt,
      orders.updated_at AS updatedAt,
      orders.paid_at AS paidAt
    FROM orders
    INNER JOIN plans ON plans.id = orders.plan_id
    WHERE orders.user_id = ?
    ${cursorWhere}
    ORDER BY orders.created_at DESC
    LIMIT ?
  `;
}

function formatOrder(row) {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    planName: row.planName,
    status: row.status,
    amountCents: row.amountCents,
    currency: row.currency,
    stripeSessionId: row.stripeSessionId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    paidAt: row.paidAt
  };
}
