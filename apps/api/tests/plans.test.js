import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db.js';
import { listPlans } from '../src/plans.js';

describe('VPS plan catalog', () => {
  let database;

  beforeEach(() => {
    database = createDatabase(':memory:');
  });

  afterEach(() => {
    database.close();
  });

  it('seeds the three VPS plans with the prices from the supplied image', () => {
    const plans = listPlans(database);

    expect(plans).toHaveLength(3);
    expect(plans.map((plan) => [plan.id, plan.name, plan.monthlyPriceCents])).toEqual([
      ['vps-nvme-2', 'VPS NVMe 2', 9919],
      ['vps-nvme-4', 'VPS NVMe 4', 18939],
      ['vps-nvme-8', 'VPS NVMe 8', 28999]
    ]);
  });

  it('marks NVMe 4 and NVMe 8 with the same visual labels shown in the image', () => {
    const plans = listPlans(database);

    expect(plans.find((plan) => plan.id === 'vps-nvme-4')?.badge).toBe('Mais popular');
    expect(plans.find((plan) => plan.id === 'vps-nvme-8')?.badge).toBe('Recomendado');
  });
});
