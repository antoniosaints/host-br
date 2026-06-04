# Hostbr VPS

Monorepo React + Node.js para venda inicial de planos VPS Hostbr.

## Estrutura

- `apps/web`: React + Vite.
- `apps/api`: Express, SQLite, login local e Stripe Checkout.
- `data/hostbr.sqlite`: banco local criado automaticamente em desenvolvimento.

## Planos iniciais

Os planos foram cadastrados com os valores da imagem de referência:

- VPS NVMe 2: R$ 99,19/mês
- VPS NVMe 4: R$ 189,39/mês
- VPS NVMe 8: R$ 289,99/mês

## Configuração

Copie `.env.example` para `.env` e configure:

```bash
JWT_SECRET=uma-chave-segura
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

Em produção com frontend e API em domínios HTTPS diferentes, use:

```bash
COOKIE_SAME_SITE=none
COOKIE_SECURE=true
```

Sem `STRIPE_SECRET_KEY`, login, planos e área do cliente funcionam, mas o checkout retorna um erro claro pedindo a chave do Stripe.

## Comandos

```bash
npm install
npm run dev
npm test
npm run build
```

URLs locais:

- Web: `http://localhost:5173`
- API: `http://localhost:3333`
- Health: `http://localhost:3333/health`

## Webhook Stripe

Para testar webhooks localmente:

```bash
stripe listen --forward-to localhost:3333/api/v1/stripe/webhook
```

Use o `whsec_...` gerado pelo Stripe CLI em `STRIPE_WEBHOOK_SECRET`.

O retorno de sucesso do Checkout também chama `/api/v1/checkout/sessions/:sessionId/sync`, então a compra pode ser sincronizada após o redirect mesmo durante testes locais.
