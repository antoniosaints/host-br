import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import {
  clearSessionCookie,
  loginUser,
  readSessionUser,
  registerUser,
  SESSION_COOKIE,
  setSessionCookie,
  signSession
} from './auth.js';
import { asyncHandler, httpError, sendError } from './httpError.js';
import { listOrdersForUser } from './orders.js';
import { listPlans } from './plans.js';
import {
  createCheckoutSession,
  createStripeClient,
  handleStripeWebhook,
  syncCheckoutSession
} from './stripeService.js';

export function createApp({ database, env = process.env, stripeClient = undefined }) {
  const app = express();
  const jwtSecret = env.JWT_SECRET || 'dev-hostbr-secret-change-me';
  const stripe = stripeClient === undefined ? createStripeClient(env.STRIPE_SECRET_KEY) : stripeClient;

  app.use((request, response, next) => {
    request.requestId = request.headers['x-request-id'] || `req_${randomUUID()}`;
    response.setHeader('X-Request-Id', request.requestId);
    next();
  });

  app.post(
    '/api/v1/stripe/webhook',
    express.raw({ type: 'application/json' }),
    asyncHandler(async (request, response) => {
      const result = handleStripeWebhook({
        database,
        stripe,
        rawBody: request.body,
        signature: request.headers['stripe-signature'],
        env
      });

      response.json(result);
    })
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (request, response) => {
    response.json({ ok: true, name: 'Hostbr API' });
  });

  app.get('/api/v1/plans', (request, response) => {
    response.json({ items: listPlans(database) });
  });

  app.post(
    '/api/v1/auth/register',
    asyncHandler(async (request, response) => {
      const user = await registerUser(database, request.body);
      const token = signSession(user, jwtSecret);
      setSessionCookie(response, token, env);
      response.status(201).json({ user });
    })
  );

  app.post(
    '/api/v1/auth/login',
    asyncHandler(async (request, response) => {
      const user = await loginUser(database, request.body);
      const token = signSession(user, jwtSecret);
      setSessionCookie(response, token, env);
      response.json({ user });
    })
  );

  app.post('/api/v1/auth/logout', (request, response) => {
    clearSessionCookie(response, env);
    response.status(204).send();
  });

  app.get('/api/v1/auth/me', requireAuth(database, jwtSecret), (request, response) => {
    response.json({ user: request.user });
  });

  app.post(
    '/api/v1/checkout/sessions',
    requireAuth(database, jwtSecret),
    asyncHandler(async (request, response) => {
      if (!request.body?.planId) {
        throw httpError(422, 'validation_failed', 'Informe o plano escolhido.');
      }

      const result = await createCheckoutSession({
        database,
        stripe,
        user: request.user,
        planId: request.body.planId,
        env
      });

      response.status(201).json(result);
    })
  );

  app.get(
    '/api/v1/checkout/sessions/:sessionId/sync',
    requireAuth(database, jwtSecret),
    asyncHandler(async (request, response) => {
      const order = await syncCheckoutSession({
        database,
        stripe,
        sessionId: request.params.sessionId,
        user: request.user
      });

      response.json({ order });
    })
  );

  app.get('/api/v1/orders', requireAuth(database, jwtSecret), (request, response) => {
    response.json(
      listOrdersForUser(database, request.user.id, {
        limit: request.query.limit,
        cursor: request.query.cursor
      })
    );
  });

  app.use((request, response, next) => {
    next(httpError(404, 'not_found', 'Rota não encontrada.'));
  });

  app.use(sendError);

  return app;
}

function requireAuth(database, jwtSecret) {
  return (request, response, next) => {
    try {
      const bearerToken = request.headers.authorization?.startsWith('Bearer ')
        ? request.headers.authorization.slice('Bearer '.length)
        : null;
      const token = request.cookies?.[SESSION_COOKIE] || bearerToken;
      request.user = readSessionUser(database, token, jwtSecret);
      next();
    } catch (error) {
      next(error);
    }
  };
}
