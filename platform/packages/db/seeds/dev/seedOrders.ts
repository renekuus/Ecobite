import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { batchInsert, r2, pick, randInt, yyyymmdd, addMin, randomTimeOnDay, legKm } from './helpers.js';
import type { SeededMerchant } from './seedMerchants.js';
import type { SeededCustomer } from './seedCustomers.js';
import type { SeededCourier } from './seedCouriers.js';

// ─── Constants (aligned with packages/shared/src/constants/pricing.ts) ───────

const COMMISSION_RATE: Record<string, number> = {
  qsr: 0.10, restaurant: 0.19, darkstore: 0.30, other: 0.115,
};

const DEFAULT_DELIVERY_FEE_EUR = 4.90;

// ─── Mix evolution (mirrors simulation logic exactly) ─────────────────────────
// epoch: 2026-03-01; drift: QSR -5%/m, restaurant -2%/m, other -1%/m, darkstore = remainder

function mixForDay(dayOffset: number): Record<string, number> {
  const months = dayOffset / 30;
  const qsr        = Math.max(0, 0.50 - 0.05 * months);
  const restaurant = Math.max(0, 0.20 - 0.02 * months);
  const other      = Math.max(0, 0.10 - 0.01 * months);
  let   darkstore  = 1 - qsr - restaurant - other;

  if (darkstore > 0.50) {
    const excess = darkstore - 0.50;
    darkstore = 0.50;
    const total = qsr + restaurant + other;
    if (total > 0) {
      const f = excess / total;
      return {
        qsr:        qsr        * (1 + f),
        restaurant: restaurant * (1 + f),
        other:      other      * (1 + f),
        darkstore:  0.50,
      };
    }
  }
  return { qsr, restaurant, other, darkstore };
}

function pickGroup(mix: Record<string, number>, rand: () => number): string {
  const r = rand();
  let acc = 0;
  for (const [group, frac] of Object.entries(mix)) {
    acc += frac;
    if (r < acc) return group;
  }
  return 'qsr';
}

// ─── Main seeder ──────────────────────────────────────────────────────────────

export async function seedOrders(
  client: PoolClient,
  rng: () => number,
  merchants: SeededMerchant[],
  customers: SeededCustomer[],
  couriers: SeededCourier[],
): Promise<void> {
  // Seed data spans 45 days ending yesterday
  const TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0);
  const SEED_DAYS = 45;
  const EPOCH = new Date(TODAY);
  EPOCH.setDate(EPOCH.getDate() - SEED_DAYS);

  // Simulation epoch for mix calc: 2026-03-01
  const MIX_EPOCH = new Date('2026-03-01T00:00:00Z');

  // Index merchants by group for fast lookup
  const byGroup: Record<string, SeededMerchant[]> = {};
  for (const m of merchants) {
    (byGroup[m.merchant_group] ??= []).push(m);
  }

  // ── Accumulate all rows in memory, then bulk-insert ──

  const orderRows:      Record<string, unknown>[] = [];
  const itemRows:       Record<string, unknown>[] = [];
  const eventRows:      Record<string, unknown>[] = [];

  // We'll build trips after orders are known
  interface DayOrder {
    id: string;
    merchant: SeededMerchant;
    customer: SeededCustomer;
    status: string;
    subtotal: number;
    deliveryFee: number;
    placedAt: Date;
    deliveredAt: Date | null;
    courierId: string | null;
    tripId: string | null;
    orderNumber: string;
    dayIndex: number;
  }

  const allOrders: DayOrder[] = [];
  let orderSeq = 1;

  for (let day = 0; day < SEED_DAYS; day++) {
    const calDate = new Date(EPOCH);
    calDate.setDate(calDate.getDate() + day);

    // Day offset from mix epoch
    const mixDayOffset = Math.round((calDate.getTime() - MIX_EPOCH.getTime()) / 86400_000);
    const mix = mixForDay(Math.max(0, mixDayOffset));

    // Order volume: grows from ~15/day to ~20/day over 45 days
    const nOrders = Math.round(14 + rng() * 4 + day * 0.14);

    // Is this the last (partial) day? Don't mark orders as delivered yet
    const isToday = day === SEED_DAYS - 1;

    for (let i = 0; i < nOrders; i++) {
      const group    = pickGroup(mix, rng);
      const merchant = pick(byGroup[group] ?? merchants, rng);
      const customer = pick(customers, rng);

      // Status — historical orders mostly delivered; today's are active
      let status: string;
      if (isToday) {
        const activePool = ['placed', 'confirmed', 'preparing', 'ready'];
        status = pick(activePool, rng);
      } else if (rng() < 0.10) {
        status = 'cancelled';
      } else if (rng() < 0.035) {
        status = 'failed';
      } else {
        status = 'delivered';
      }

      // Timestamps
      const placedAt = randomTimeOnDay(calDate, 10, 22, rng);

      let actualDeliveredAt: Date | null = null;
      let courierId: string | null = null;

      if (status === 'delivered') {
        // Total order time 30–55 min
        actualDeliveredAt = addMin(placedAt, randInt(30, 55, rng));
        courierId = pick(couriers, rng).id;
      }

      // Products — pick 1–4 items
      const products = merchant.products;
      const nItems = randInt(1, Math.min(4, products.length), rng);
      const pickedProducts: Array<{ product: (typeof products)[0]; qty: number }> = [];
      const usedIdx = new Set<number>();
      for (let p = 0; p < nItems; p++) {
        let idx: number;
        do { idx = Math.floor(rng() * products.length); } while (usedIdx.has(idx));
        usedIdx.add(idx);
        const qty = rng() < 0.85 ? 1 : 2;
        pickedProducts.push({ product: products[idx]!, qty });
      }

      let subtotal = 0;
      pickedProducts.forEach(({ product, qty }) => { subtotal += product.price_eur * qty; });
      subtotal = r2(subtotal);

      const deliveryFee = subtotal < merchant.free_delivery_threshold_eur
        ? DEFAULT_DELIVERY_FEE_EUR
        : 0;
      const commission  = r2(subtotal * merchant.commission_rate);
      const grossProfit = r2(commission + deliveryFee);
      const tipEur      = rng() < 0.18 ? r2(Math.floor(rng() * 4) + 1) : 0;

      const dateStr     = yyyymmdd(calDate);
      const orderNumber = `EB-${dateStr}-${String(orderSeq++).padStart(4, '0')}`;
      const orderId     = randomUUID();
      const estimatedAt = addMin(placedAt, randInt(35, 55, rng));

      const addressSnap = {
        street:     customer.address.street,
        city:       customer.address.city,
        postalCode: customer.address.postal_code,
        lat:        customer.address.lat,
        lng:        customer.address.lng,
      };

      orderRows.push({
        id:                        orderId,
        order_number:              orderNumber,
        customer_id:               customer.id,
        merchant_id:               merchant.id,
        merchant_group:            group,
        courier_id:                courierId,
        trip_id:                   null, // filled in trip pass below
        status,
        delivery_address_id:       customer.address.id,
        delivery_address_snapshot: JSON.stringify(addressSnap),
        subtotal_eur:              subtotal,
        delivery_fee_eur:          deliveryFee,
        service_fee_eur:           0,
        tip_eur:                   tipEur,
        commission_eur:            commission,
        gross_profit_eur:          grossProfit,
        sla:                       JSON.stringify({ promisedEtaMin: 45, stages: [] }),
        urgency:                   'green',
        notes:                     null,
        cancellation_reason:       status === 'cancelled' ? 'Changed my mind' : null,
        estimated_delivery_at:     estimatedAt.toISOString(),
        actual_delivered_at:       actualDeliveredAt?.toISOString() ?? null,
        created_at:                placedAt.toISOString(),
        updated_at:                (actualDeliveredAt ?? placedAt).toISOString(),
      });

      // Order items
      pickedProducts.forEach(({ product, qty }) => {
        itemRows.push({
          id:                   randomUUID(),
          order_id:             orderId,
          product_id:           product.id,
          product_name_snapshot: product.name,
          price_snapshot_eur:   product.price_eur,
          quantity:             qty,
          modifier_snapshot:    '[]',
          line_total_eur:       r2(product.price_eur * qty),
        });
      });

      allOrders.push({
        id: orderId, merchant, customer, status,
        subtotal, deliveryFee, placedAt,
        deliveredAt: actualDeliveredAt,
        courierId, tripId: null,
        orderNumber, dayIndex: day,
      });
    }
  }

  // ── Insert orders and items first (trip_id = NULL for now) ──
  await batchInsert(client, 'orders',
    ['id', 'order_number', 'customer_id', 'merchant_id', 'merchant_group',
     'courier_id', 'trip_id', 'status', 'delivery_address_id', 'delivery_address_snapshot',
     'subtotal_eur', 'delivery_fee_eur', 'service_fee_eur', 'tip_eur',
     'commission_eur', 'gross_profit_eur', 'sla', 'urgency', 'notes',
     'cancellation_reason', 'estimated_delivery_at', 'actual_delivered_at',
     'created_at', 'updated_at'],
    orderRows,
  );
  console.log(`  ✓ orders:         ${orderRows.length}`);

  await batchInsert(client, 'order_items',
    ['id', 'order_id', 'product_id', 'product_name_snapshot', 'price_snapshot_eur',
     'quantity', 'modifier_snapshot', 'line_total_eur'],
    itemRows,
  );
  console.log(`  ✓ order_items:    ${itemRows.length}`);

  // ── Build trips from delivered orders ────────────────────────────────────────

  const deliveredOrders = allOrders.filter(o => o.status === 'delivered');

  // Group by (dayIndex, merchant.id) for realistic same-merchant batching
  const batchKey = (o: DayOrder) => `${o.dayIndex}::${o.merchant.id}`;
  const buckets = new Map<string, DayOrder[]>();
  for (const o of deliveredOrders) {
    const k = batchKey(o);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(o);
  }

  const tripRows:      Record<string, unknown>[] = [];
  const tripStopRows:  Record<string, unknown>[] = [];
  const tripIdUpdates: Array<{ tripId: string; orderIds: string[] }> = [];

  for (const bucket of buckets.values()) {
    // Shuffle within bucket for variety
    bucket.sort(() => rng() - 0.5);

    let idx = 0;
    while (idx < bucket.length) {
      // Batch size: weighted toward 2–3 orders per trip
      const r = rng();
      const batchSize = r < 0.25 ? 1
                      : r < 0.65 ? 2
                      : r < 0.90 ? 3
                      : 4;
      const batch = bucket.slice(idx, idx + batchSize);
      idx += batchSize;

      const courier  = pick(couriers, rng);
      const tripId   = randomUUID();
      const merchant = batch[0]!.merchant;

      // Trip timestamps: started shortly after the latest order was placed
      const latestPlaced = batch.reduce<Date>(
        (max, o) => o.placedAt > max ? o.placedAt : max,
        batch[0]!.placedAt,
      );
      const startedAt   = addMin(latestPlaced, randInt(15, 25, rng));
      const completedAt = addMin(startedAt,    randInt(20 + batch.length * 5, 40 + batch.length * 5, rng));
      const totalKm     = r2(batch.length * (0.8 + rng() * 2.5));

      tripRows.push({
        id:                tripId,
        courier_id:        courier.id,
        status:            'completed',
        total_km:          totalKm,
        courier_payout_eur: 20.00,
        started_at:        startedAt.toISOString(),
        completed_at:      completedAt.toISOString(),
        created_at:        latestPlaced.toISOString(),
      });

      tripIdUpdates.push({ tripId, orderIds: batch.map(o => o.id) });

      // Trip stops: 1 pickup (at merchant), then N dropoffs (at customer addresses)
      let seq = 1;

      // Pickup stop
      tripStopRows.push({
        id:              randomUUID(),
        trip_id:         tripId,
        order_id:        null,
        merchant_id:     merchant.id,
        stop_type:       'pickup',
        sequence_number: seq++,
        address_snapshot: JSON.stringify({
          street: merchant.name,
          city:   'Helsinki',
          lat:    merchant.lat,
          lng:    merchant.lng,
        }),
        distance_from_previous_km: null,
        arrived_at:    startedAt.toISOString(),
        completed_at:  addMin(startedAt, randInt(3, 8, rng)).toISOString(),
      });

      // Dropoff stops
      let prevLat = merchant.lat;
      let prevLng = merchant.lng;
      const stopInterval = Math.round((completedAt.getTime() - startedAt.getTime()) / (batch.length + 1) / 60_000);

      batch.forEach((order, bi) => {
        const cLat = order.customer.address.lat;
        const cLng = order.customer.address.lng;
        const dist = legKm(prevLat, prevLng, cLat, cLng);
        const arrivedAt   = addMin(startedAt, (bi + 1) * stopInterval);
        const completedAt = addMin(arrivedAt, randInt(1, 4, rng));

        tripStopRows.push({
          id:              randomUUID(),
          trip_id:         tripId,
          order_id:        order.id,
          merchant_id:     null,
          stop_type:       'dropoff',
          sequence_number: seq++,
          address_snapshot: JSON.stringify({
            street: order.customer.address.street,
            city:   order.customer.address.city,
            lat:    cLat,
            lng:    cLng,
          }),
          distance_from_previous_km: dist,
          arrived_at:   arrivedAt.toISOString(),
          completed_at: completedAt.toISOString(),
        });

        prevLat = cLat;
        prevLng = cLng;
      });
    }
  }

  // Insert trips
  await batchInsert(client, 'trips',
    ['id', 'courier_id', 'status', 'total_km', 'courier_payout_eur',
     'started_at', 'completed_at', 'created_at'],
    tripRows,
  );
  console.log(`  ✓ trips:          ${tripRows.length}`);

  // Update orders.trip_id in batches of 100
  for (const { tripId, orderIds } of tripIdUpdates) {
    await client.query(
      `UPDATE orders SET trip_id = $1 WHERE id = ANY($2::uuid[])`,
      [tripId, orderIds],
    );
  }

  // Insert trip stops
  await batchInsert(client, 'trip_stops',
    ['id', 'trip_id', 'order_id', 'merchant_id', 'stop_type', 'sequence_number',
     'address_snapshot', 'distance_from_previous_km', 'arrived_at', 'completed_at'],
    tripStopRows,
  );
  console.log(`  ✓ trip_stops:     ${tripStopRows.length}`);

  // ── Order events (audit trail) ────────────────────────────────────────────────

  const LIFECYCLE_DELIVERED = [
    { from: null,          to: 'placed',     actor: 'system',   minAfter: 0 },
    { from: 'placed',      to: 'confirmed',  actor: 'merchant', minAfter: 3 },
    { from: 'confirmed',   to: 'preparing',  actor: 'merchant', minAfter: 2 },
    { from: 'preparing',   to: 'ready',      actor: 'merchant', minAfter: 15 },
    { from: 'ready',       to: 'assigned',   actor: 'system',   minAfter: 3 },
    { from: 'assigned',    to: 'picked_up',  actor: 'courier',  minAfter: 8 },
    { from: 'picked_up',   to: 'delivering', actor: 'courier',  minAfter: 1 },
    { from: 'delivering',  to: 'delivered',  actor: 'courier',  minAfter: 20 },
  ] as const;

  // Build a lookup of orderId → DayOrder for event generation
  const orderMap = new Map(allOrders.map(o => [o.id, o]));

  // Also need merchantUserId per merchant and courierId per delivered order
  // We have courierId on the DayOrder itself
  // For merchant actor_id we use the merchant_user_id stored in SeededMerchant

  // merchant_user lookup
  const merchantUserById = new Map(merchants.map(m => [m.id, m.merchant_user_id]));

  for (const o of allOrders) {
    let t = o.placedAt;

    if (o.status === 'delivered') {
      for (const step of LIFECYCLE_DELIVERED) {
        t = addMin(t, step.minAfter + randInt(0, 2, rng));
        let actorId: string | null = null;
        if (step.actor === 'merchant') actorId = merchantUserById.get(o.merchant.id) ?? null;
        if (step.actor === 'courier')  actorId = o.courierId;

        eventRows.push({
          id:          randomUUID(),
          order_id:    o.id,
          actor_type:  step.actor,
          actor_id:    actorId,
          from_status: step.from,
          to_status:   step.to,
          metadata:    '{}',
          created_at:  t.toISOString(),
        });
      }
    } else if (o.status === 'cancelled') {
      // placed → cancelled by customer
      eventRows.push(
        {
          id: randomUUID(), order_id: o.id,
          actor_type: 'system', actor_id: null,
          from_status: null, to_status: 'placed',
          metadata: '{}', created_at: t.toISOString(),
        },
        {
          id: randomUUID(), order_id: o.id,
          actor_type: 'customer', actor_id: o.customer.id,
          from_status: 'placed', to_status: 'cancelled',
          metadata: JSON.stringify({ reason: 'Changed my mind' }),
          created_at: addMin(t, randInt(5, 15, rng)).toISOString(),
        },
      );
    } else if (o.status === 'failed') {
      // placed → confirmed → failed (payment or dispatch issue)
      eventRows.push(
        {
          id: randomUUID(), order_id: o.id,
          actor_type: 'system', actor_id: null,
          from_status: null, to_status: 'placed',
          metadata: '{}', created_at: t.toISOString(),
        },
        {
          id: randomUUID(), order_id: o.id,
          actor_type: 'merchant', actor_id: merchantUserById.get(o.merchant.id) ?? null,
          from_status: 'placed', to_status: 'confirmed',
          metadata: '{}', created_at: addMin(t, 3).toISOString(),
        },
        {
          id: randomUUID(), order_id: o.id,
          actor_type: 'system', actor_id: null,
          from_status: 'confirmed', to_status: 'failed',
          metadata: JSON.stringify({ reason: 'No courier available' }),
          created_at: addMin(t, 65).toISOString(),
        },
      );
    } else {
      // Active order — emit events up to current status
      const statusChain = ['placed', 'confirmed', 'preparing', 'ready'];
      const stopAt = statusChain.indexOf(o.status);
      for (let s = 0; s <= stopAt; s++) {
        const from = s === 0 ? null : statusChain[s - 1]!;
        const to   = statusChain[s]!;
        const actor = s === 0 ? 'system' : (s >= 2 ? 'merchant' : 'merchant');
        eventRows.push({
          id:          randomUUID(),
          order_id:    o.id,
          actor_type:  actor,
          actor_id:    actor === 'merchant' ? (merchantUserById.get(o.merchant.id) ?? null) : null,
          from_status: from,
          to_status:   to,
          metadata:    '{}',
          created_at:  addMin(t, s * 4).toISOString(),
        });
      }
    }
  }

  await batchInsert(client, 'order_events',
    ['id', 'order_id', 'actor_type', 'actor_id', 'from_status', 'to_status', 'metadata', 'created_at'],
    eventRows,
  );
  console.log(`  ✓ order_events:   ${eventRows.length}`);
}
