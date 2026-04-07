import type { PoolClient } from 'pg';
import { rng } from './helpers.js';
import { seedCustomers } from './seedCustomers.js';
import { seedMerchants } from './seedMerchants.js';
import { seedCouriers } from './seedCouriers.js';
import { seedOrders } from './seedOrders.js';

/**
 * Truncate all seeded tables (in reverse FK order) then run all seeders.
 * Safe to call repeatedly — each run produces a fresh, deterministic dataset.
 */
export async function seed(client: PoolClient): Promise<void> {
  console.log('\n🗑  Truncating tables…');
  await client.query(`
    TRUNCATE
      order_events,
      trip_stops,
      order_items,
      trips,
      orders,
      customer_addresses,
      merchant_users,
      products,
      customers,
      merchants,
      couriers
    CASCADE
  `);
  console.log('  ✓ tables cleared\n');

  console.log('👤 Seeding customers…');
  const customers = await seedCustomers(client, rng, 75);

  console.log('\n🏪 Seeding merchants…');
  const merchants = await seedMerchants(client);

  console.log('\n🚴 Seeding couriers…');
  const couriers = await seedCouriers(client, rng);

  console.log('\n📦 Seeding orders, items, trips, stops, events…');
  await seedOrders(client, rng, merchants, customers, couriers);

  console.log('\n✅ Dev seed complete\n');
  console.log('─────────────────────────────────────────────');
  console.log('Credentials (password: devpassword)');
  console.log('  Admin:    Set ADMIN_EMAIL / ADMIN_PASSWORD in .env');
  console.log('  Merchant: owner@hesburger-kamppi.ecobitedemo.fi');
  console.log('  Merchant: owner@ecobitek-darkkallio.ecobitedemo.fi');
  console.log('─────────────────────────────────────────────\n');
}
