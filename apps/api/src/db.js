import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PLAN_SEED = [
  {
    id: 'vps-nvme-2',
    name: 'VPS NVMe 2',
    badge: null,
    monthlyPriceCents: 9919,
    vcpu: 1,
    ramGb: 2,
    storageGb: 50,
    ctaVariant: 'blue',
    sortOrder: 1
  },
  {
    id: 'vps-nvme-4',
    name: 'VPS NVMe 4',
    badge: 'Mais popular',
    monthlyPriceCents: 18939,
    vcpu: 2,
    ramGb: 4,
    storageGb: 100,
    ctaVariant: 'blue',
    sortOrder: 2
  },
  {
    id: 'vps-nvme-8',
    name: 'VPS NVMe 8',
    badge: 'Recomendado',
    monthlyPriceCents: 28999,
    vcpu: 4,
    ramGb: 8,
    storageGb: 200,
    ctaVariant: 'yellow',
    sortOrder: 3
  }
];

function planFeatures(plan) {
  return [
    `${plan.vcpu} vCPU`,
    `${plan.ramGb} GB de RAM DDR5`,
    `${plan.storageGb} GB de armazenamento NVMe`,
    'Transferência ilimitada',
    'Servidores cloud no Brasil',
    'cPanel disponível',
    '1 IP dedicado',
    'Migração grátis'
  ];
}

export function createDatabase(filePath = process.env.DATABASE_URL || 'data/hostbr.sqlite') {
  const resolvedPath = filePath === ':memory:' ? filePath : resolve(filePath);

  if (resolvedPath !== ':memory:') {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }

  const database = new DatabaseSync(resolvedPath);
  database.exec('PRAGMA foreign_keys = ON;');
  migrate(database);
  seedPlans(database);

  return database;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      badge TEXT,
      monthly_price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      vcpu INTEGER NOT NULL,
      ram_gb INTEGER NOT NULL,
      storage_gb INTEGER NOT NULL,
      cta_variant TEXT NOT NULL,
      features_json TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      stripe_session_id TEXT UNIQUE,
      stripe_subscription_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      paid_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
  `);
}

function seedPlans(database) {
  const statement = database.prepare(`
    INSERT INTO plans (
      id,
      name,
      badge,
      monthly_price_cents,
      currency,
      vcpu,
      ram_gb,
      storage_gb,
      cta_variant,
      features_json,
      sort_order,
      updated_at
    )
    VALUES (?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      badge = excluded.badge,
      monthly_price_cents = excluded.monthly_price_cents,
      vcpu = excluded.vcpu,
      ram_gb = excluded.ram_gb,
      storage_gb = excluded.storage_gb,
      cta_variant = excluded.cta_variant,
      features_json = excluded.features_json,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at
  `);

  const now = new Date().toISOString();

  for (const plan of PLAN_SEED) {
    statement.run(
      plan.id,
      plan.name,
      plan.badge,
      plan.monthlyPriceCents,
      plan.vcpu,
      plan.ramGb,
      plan.storageGb,
      plan.ctaVariant,
      JSON.stringify(planFeatures(plan)),
      plan.sortOrder,
      now
    );
  }
}
