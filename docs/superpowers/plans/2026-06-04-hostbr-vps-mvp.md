# Hostbr VPS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional Hostbr VPS sales MVP with React, Express, SQLite, customer login, Stripe Checkout, and a customer purchase area.

**Architecture:** Create a two-workspace npm monorepo. The Express API owns plan data, auth, orders, SQLite persistence, and Stripe integration. The Vite React app consumes `/api/v1`, renders the plan-card UI from the image, and provides checkout/client flows.

**Tech Stack:** React, Vite, Express, Node `node:sqlite`, Stripe SDK, bcryptjs, jsonwebtoken, Vitest, Supertest.

---

### Task 1: Workspace And Backend RED Tests

**Files:**
- Create: `package.json`
- Create: `apps/api/package.json`
- Create: `apps/api/tests/plans.test.js`
- Create: `apps/api/tests/auth-orders.test.js`

- [ ] **Step 1: Create workspace/package test scaffolding**

Add root npm workspaces and API package scripts.

- [ ] **Step 2: Write failing backend tests**

Add tests asserting the three image plans, registration/login behavior, protected order access, and clear 503 checkout error when Stripe is not configured.

- [ ] **Step 3: Run RED test command**

Run: `npm test --workspace @hostbr/api`

Expected: FAIL because API modules do not exist yet.

### Task 2: Backend GREEN Implementation

**Files:**
- Create: `apps/api/src/db.js`
- Create: `apps/api/src/httpError.js`
- Create: `apps/api/src/plans.js`
- Create: `apps/api/src/auth.js`
- Create: `apps/api/src/orders.js`
- Create: `apps/api/src/stripeService.js`
- Create: `apps/api/src/app.js`
- Create: `apps/api/src/server.js`
- Create: `apps/api/.env.example`

- [ ] **Step 1: Implement SQLite schema and plan seed**

Create users, plans, and orders tables; seed the exact image plans with centavo amounts.

- [ ] **Step 2: Implement auth services**

Validate name/email/password, hash passwords with bcryptjs, issue JWT, and expose cookie helpers.

- [ ] **Step 3: Implement order and checkout services**

Create pending orders, require Stripe secret for checkout, build monthly subscription sessions, sync paid sessions, and list user orders with a limit cap.

- [ ] **Step 4: Implement Express routes**

Expose `/api/v1` routes, raw Stripe webhook route, consistent errors, request IDs, CORS, and auth middleware.

- [ ] **Step 5: Run GREEN backend tests**

Run: `npm test --workspace @hostbr/api`

Expected: PASS.

### Task 3: Frontend Implementation

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.js`
- Create: `apps/web/src/main.jsx`
- Create: `apps/web/src/api.js`
- Create: `apps/web/src/App.jsx`
- Create: `apps/web/src/styles.css`

- [ ] **Step 1: Create Vite React workspace**

Configure Vite dev proxy from `/api` to the Express API.

- [ ] **Step 2: Implement API client and auth state**

Use `fetch` with `credentials: include`, error normalization, login, register, logout, plans, checkout, sync, and orders calls.

- [ ] **Step 3: Implement plan cards from the image**

Render the three plan cards with the approved prices, blue/yellow/gray colors, labels, feature ticks, and responsive layout.

- [ ] **Step 4: Implement checkout and customer area**

Add checkout page, auth form tabs, Stripe redirect, success sync, cancel page, and `/cliente` purchases view.

### Task 4: Docs, Install, Build, And Run

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Add environment and run documentation**

Document Stripe variables, SQLite path, dev commands, and webhook testing.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Start dev server**

Run: `npm run dev`

Expected: API on `http://localhost:3333` and web on `http://localhost:5173`.
