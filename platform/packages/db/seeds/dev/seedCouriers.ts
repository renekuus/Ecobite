import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { batchInsert, pick, randInt } from './helpers.js';
import { COURIER_NAMES, VEHICLE_TYPES } from './fixtures.js';

export interface SeededCourier {
  id: string;
  name: string;
}

export async function seedCouriers(
  client: PoolClient,
  rng: () => number,
): Promise<SeededCourier[]> {
  const rows: Record<string, unknown>[] = [];
  const result: SeededCourier[] = [];

  COURIER_NAMES.forEach((name, i) => {
    const id = randomUUID();
    const emailBase = name.toLowerCase()
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/å/g, 'a')
      .replace(/\s/g, '.');
    const email    = `${emailBase}.${i + 1}@couriers.ecobitedemo.fi`;
    const phone    = `+3584${randInt(0, 9, rng)}${String(randInt(1000000, 9999999, rng))}`;
    const vehicle  = pick([...VEHICLE_TYPES], rng);
    const rating   = rng() < 0.85 ? parseFloat((3.8 + rng() * 1.2).toFixed(2)) : null;
    // 70% active, 30% inactive (represents current on-platform status, not shift)
    const status   = rng() < 0.70 ? 'active' : 'inactive';

    rows.push({
      id,
      email,
      phone,
      name,
      status,
      vehicle_type: vehicle,
      rating,
      created_at: new Date(Date.now() - randInt(7, 120, rng) * 86400_000).toISOString(),
    });

    result.push({ id, name });
  });

  await batchInsert(client, 'couriers',
    ['id', 'email', 'phone', 'name', 'status', 'vehicle_type', 'rating', 'created_at'],
    rows,
  );

  console.log(`  ✓ couriers:       ${rows.length}`);
  return result;
}
