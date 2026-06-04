import { httpError } from './httpError.js';

export function listPlans(database) {
  return database
    .prepare(
      `
      SELECT
        id,
        name,
        badge,
        monthly_price_cents AS monthlyPriceCents,
        currency,
        vcpu,
        ram_gb AS ramGb,
        storage_gb AS storageGb,
        cta_variant AS ctaVariant,
        features_json AS featuresJson
      FROM plans
      ORDER BY sort_order ASC
    `
    )
    .all()
    .map(formatPlan);
}

export function getPlan(database, planId) {
  const row = database
    .prepare(
      `
      SELECT
        id,
        name,
        badge,
        monthly_price_cents AS monthlyPriceCents,
        currency,
        vcpu,
        ram_gb AS ramGb,
        storage_gb AS storageGb,
        cta_variant AS ctaVariant,
        features_json AS featuresJson
      FROM plans
      WHERE id = ?
    `
    )
    .get(planId);

  if (!row) {
    throw httpError(404, 'plan_not_found', 'Plano não encontrado.');
  }

  return formatPlan(row);
}

function formatPlan(row) {
  return {
    id: row.id,
    name: row.name,
    badge: row.badge,
    monthlyPriceCents: row.monthlyPriceCents,
    monthlyPrice: row.monthlyPriceCents / 100,
    currency: row.currency,
    vcpu: row.vcpu,
    ramGb: row.ramGb,
    storageGb: row.storageGb,
    ctaVariant: row.ctaVariant,
    features: JSON.parse(row.featuresJson)
  };
}
