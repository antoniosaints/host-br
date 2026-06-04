# Hostbr VPS MVP Design

## Scope

Build a functional VPS sales MVP named Hostbr in a React and Node.js monorepo. The first usable screen is the plan selection surface copied from the supplied image: three VPS NVMe cards with the same values, labels, visual hierarchy, blue/yellow CTA colors, gray "Mais popular" ribbon, and blue "Recomendado" ribbon.

The first management scope is customer self-service only: account creation/login, Stripe checkout, and a customer area listing purchases. There is no VPS provisioning, admin panel, invoice automation, or support chat in this first version.

## Architecture

The monorepo has two workspaces:

- `apps/web`: React + Vite frontend with pages for plans, checkout, payment success/cancel, and client area.
- `apps/api`: Express API with SQLite persistence via Node's built-in `node:sqlite`, local authentication, Stripe Checkout, and Stripe webhook handling.

SQLite stores users, plans, and orders. Plans are seeded from the image values so the frontend and checkout use the same backend source of truth.

## Plan Catalog

The initial catalog is fixed:

- `VPS NVMe 2`: R$ 99,19/month, 1 vCPU, 2 GB RAM DDR5, 50 GB NVMe, unlimited transfer, Brazil cloud servers, cPanel available, 1 dedicated IP, free migration.
- `VPS NVMe 4`: R$ 189,39/month, 2 vCPU, 4 GB RAM DDR5, 100 GB NVMe, same common benefits, labeled "Mais popular".
- `VPS NVMe 8`: R$ 289,99/month, 4 vCPU, 8 GB RAM DDR5, 200 GB NVMe, same common benefits, labeled "Recomendado" with yellow CTA.

## API Contract

Base path: `/api/v1`.

Canonical error shape:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Revise os dados enviados.",
    "details": {},
    "requestId": "req_..."
  }
}
```

Endpoints:

- `GET /health`: public health check.
- `GET /api/v1/plans`: public plan list. Response: `{ "items": Plan[] }`.
- `POST /api/v1/auth/register`: creates account and sets `hostbr_session` HTTP-only cookie. Request: `{ "name": string, "email": string, "password": string }`. Response 201: `{ "user": User }`. Errors: 409 email already used, 422 invalid data.
- `POST /api/v1/auth/login`: authenticates and sets cookie. Request: `{ "email": string, "password": string }`. Response 200: `{ "user": User }`. Errors: 401 invalid credentials, 422 invalid data.
- `POST /api/v1/auth/logout`: clears cookie. Response 204.
- `GET /api/v1/auth/me`: returns current user. Response 200: `{ "user": User }`. Error: 401 unauthenticated.
- `POST /api/v1/checkout/sessions`: authenticated. Request: `{ "planId": string }`. Creates a pending order and Stripe Checkout Session. Response 201: `{ "checkoutUrl": string, "sessionId": string, "orderId": string }`. Errors: 401 unauthenticated, 404 plan not found, 503 Stripe not configured.
- `GET /api/v1/checkout/sessions/:sessionId/sync`: authenticated. Retrieves Stripe session after redirect and updates the order if paid. Response 200: `{ "order": Order }`.
- `GET /api/v1/orders?limit=20&cursor=<id>`: authenticated customer purchases. Response: `{ "items": Order[], "nextCursor": string | null }`. Max limit: 50.
- `POST /api/v1/stripe/webhook`: public Stripe webhook endpoint using raw request body and `STRIPE_WEBHOOK_SECRET`.

Versioning stance: `/api/v1` is additive for this MVP. Breaking changes require `/api/v2`.

## Stripe Behavior

Checkout uses Stripe hosted Checkout in subscription mode with monthly recurring `price_data` built from the seeded plan amount. The API requires `STRIPE_SECRET_KEY` for checkout. Webhooks are supported, and the success page also calls a sync endpoint so local testing can mark orders paid after Stripe redirects back.

Required environment values are documented in `.env.example`.

## Frontend Flow

The home page shows the Hostbr header and plan cards immediately. Choosing a plan opens `/checkout/:planId`. If the visitor is not logged in, the checkout page shows compact login/register tabs. After authentication, the user can start Stripe checkout.

The customer area at `/cliente` shows login/register when anonymous. For authenticated users, it shows user identity, logout, and a table/card list of purchases with plan, amount, payment status, and purchase date.

## Testing And Verification

Backend behavior is covered with Vitest and Supertest for plan seeding, authentication, protected orders, and checkout error behavior when Stripe is not configured. Full verification requires:

- `npm test`
- `npm run build`

Manual Stripe checkout requires configured keys and a Stripe webhook or redirect sync.
