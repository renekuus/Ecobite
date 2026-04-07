import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { batchInsert } from './helpers.js';
import { MERCHANT_DEFS, type ProductDef } from './fixtures.js';

export interface SeededProduct {
  id: string;
  name: string;
  category: string;
  price_eur: number;
}

export interface SeededMerchant {
  id: string;
  name: string;
  merchant_group: string;
  lat: number;
  lng: number;
  commission_rate: number;
  delivery_fee_under_eur: number;
  free_delivery_threshold_eur: number;
  products: SeededProduct[];
  merchant_user_id: string;
}

export async function seedMerchants(client: PoolClient): Promise<SeededMerchant[]> {
  // One shared password hash for all dev merchant users — "devpassword"
  const passwordHash = await bcrypt.hash('devpassword', 10);

  const merchants: Record<string, unknown>[] = [];
  const merchantUsers: Record<string, unknown>[] = [];
  const products: Record<string, unknown>[] = [];
  const result: SeededMerchant[] = [];

  for (const def of MERCHANT_DEFS) {
    const merchantId = randomUUID();

    merchants.push({
      id: merchantId,
      name: def.name,
      slug: def.slug,
      merchant_group: def.merchant_group,
      status: 'active',
      lat: def.lat,
      lng: def.lng,
      address: def.address,
      commission_rate: def.commission_rate,
      delivery_fee_under_eur: def.delivery_fee_under_eur,
      delivery_fee_over_eur: def.delivery_fee_over_eur,
      free_delivery_threshold_eur: def.free_delivery_threshold_eur,
      min_order_value_eur: def.min_order_value_eur,
      prep_time_estimate_min: def.prep_time_estimate_min,
      operating_hours: JSON.stringify(def.operating_hours),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // One owner + one staff member per merchant
    const slugEmail = def.slug.replace(/[^a-z0-9]/g, '');
    const ownerId = randomUUID();
    merchantUsers.push(
      {
        id: ownerId,
        merchant_id: merchantId,
        email: `owner@${slugEmail}.ecobitedemo.fi`,
        role: 'owner',
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        merchant_id: merchantId,
        email: `staff@${slugEmail}.ecobitedemo.fi`,
        role: 'staff',
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
      },
    );

    // Products
    const seededProducts: SeededProduct[] = [];
    def.products.forEach((p: ProductDef, idx: number) => {
      const productId = randomUUID();
      products.push({
        id: productId,
        merchant_id: merchantId,
        name: p.name,
        description: null,
        category: p.category,
        price_eur: p.price_eur,
        is_available: true,
        is_archived: false,
        dietary_flags: JSON.stringify(p.dietary_flags),
        sort_order: idx,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      seededProducts.push({ id: productId, name: p.name, category: p.category, price_eur: p.price_eur });
    });

    result.push({
      id: merchantId,
      name: def.name,
      merchant_group: def.merchant_group,
      lat: def.lat,
      lng: def.lng,
      commission_rate: def.commission_rate,
      delivery_fee_under_eur: def.delivery_fee_under_eur,
      free_delivery_threshold_eur: def.free_delivery_threshold_eur,
      products: seededProducts,
      merchant_user_id: ownerId,
    });
  }

  await batchInsert(client, 'merchants',
    ['id', 'name', 'slug', 'merchant_group', 'status', 'lat', 'lng', 'address',
     'commission_rate', 'delivery_fee_under_eur', 'delivery_fee_over_eur',
     'free_delivery_threshold_eur', 'min_order_value_eur', 'prep_time_estimate_min',
     'operating_hours', 'created_at', 'updated_at'],
    merchants,
  );

  await batchInsert(client, 'merchant_users',
    ['id', 'merchant_id', 'email', 'role', 'password_hash', 'created_at'],
    merchantUsers,
  );

  await batchInsert(client, 'products',
    ['id', 'merchant_id', 'name', 'description', 'category', 'price_eur',
     'is_available', 'is_archived', 'dietary_flags', 'sort_order', 'created_at', 'updated_at'],
    products,
  );

  console.log(`  ✓ merchants:      ${merchants.length}`);
  console.log(`  ✓ merchant_users: ${merchantUsers.length}`);
  console.log(`  ✓ products:       ${products.length}`);

  return result;
}
