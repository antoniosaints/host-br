import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';

describe('customer auth and purchases API', () => {
  let app;
  let database;

  beforeEach(() => {
    database = createDatabase(':memory:');
    app = createApp({
      database,
      env: {
        APP_URL: 'http://localhost:5173',
        API_URL: 'http://localhost:3333',
        JWT_SECRET: 'test-secret',
        NODE_ENV: 'test'
      }
    });
  });

  afterEach(() => {
    database.close();
  });

  it('registers a customer, sets a session cookie, and returns the customer without password data', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Cliente Hostbr', email: 'cliente@hostbr.test', password: 'senha-segura' })
      .expect(201);

    expect(response.headers['set-cookie']?.join(';')).toContain('hostbr_session=');
    expect(response.body.user).toMatchObject({
      name: 'Cliente Hostbr',
      email: 'cliente@hostbr.test'
    });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('marks the session cookie as SameSite=None and Secure when app and API use different HTTPS domains', async () => {
    const productionApp = createApp({
      database,
      env: {
        APP_URL: 'https://hostbr.userp.com.br',
        API_URL: 'https://sites-hostbr.gcpwp3.easypanel.host',
        CORS_ORIGIN: 'https://hostbr.userp.com.br',
        JWT_SECRET: 'test-secret',
        NODE_ENV: 'production'
      }
    });

    const response = await request(productionApp)
      .post('/api/v1/auth/register')
      .send({ name: 'Cliente Hostbr', email: 'producao@hostbr.test', password: 'senha-segura' })
      .expect(201);

    const cookie = response.headers['set-cookie']?.join(';') || '';

    expect(cookie).toContain('hostbr_session=');
    expect(cookie).toContain('SameSite=None');
    expect(cookie).toContain('Secure');
  });

  it('requires authentication to list customer purchases', async () => {
    const response = await request(app).get('/api/v1/orders').expect(401);

    expect(response.body.error).toMatchObject({
      code: 'unauthorized',
      message: 'Entre na sua conta para continuar.'
    });
  });

  it('lists purchases for the authenticated customer after login', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/v1/auth/register')
      .send({ name: 'Cliente Hostbr', email: 'compras@hostbr.test', password: 'senha-segura' })
      .expect(201);

    const response = await agent.get('/api/v1/orders').expect(200);

    expect(response.body).toEqual({ items: [], nextCursor: null });
  });

  it('returns a clear service error when checkout is requested without Stripe configuration', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/v1/auth/register')
      .send({ name: 'Cliente Hostbr', email: 'stripe@hostbr.test', password: 'senha-segura' })
      .expect(201);

    const response = await agent
      .post('/api/v1/checkout/sessions')
      .send({ planId: 'vps-nvme-2' })
      .expect(503);

    expect(response.body.error).toMatchObject({
      code: 'stripe_not_configured',
      message: 'Configure a chave do Stripe para finalizar compras.'
    });
  });
});
