import { query } from '../lib/db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Granularity = 'daily' | 'weekly' | 'monthly';

const GROUPS = ['qsr', 'restaurant', 'darkstore', 'other'] as const;
type Group = (typeof GROUPS)[number];

type SegmentRecord = Record<Group, number>;

const ZERO_SEGS = (): SegmentRecord => ({ qsr: 0, restaurant: 0, darkstore: 0, other: 0 });

export interface MixDayPoint {
  /** Bucket start date as YYYY-MM-DD.
   *  daily   → the calendar day
   *  weekly  → ISO Monday of that week
   *  monthly → first day of that month */
  date: string;
  totalOrders: number;
  /** Order-count mix fractions (0–1, sum ≈ 1) */
  mix: SegmentRecord;
  /** Raw order counts per segment */
  segOrders: SegmentRecord;
  /** Sum of subtotal_eur per segment */
  segRevenue: SegmentRecord;
  /** Sum of contribution_profit_eur per segment (commission + fees − allocated courier cost) */
  segProfit: SegmentRecord;
}

export interface MixData {
  from: string;          // inclusive
  to: string;            // inclusive
  granularity: Granularity;
  totalOrders: number;
  days: MixDayPoint[];
}

// ─── DB row shape ─────────────────────────────────────────────────────────────

interface MixRow {
  bucket: Date;          // pg returns DATE columns as Date objects
  merchant_group: string;
  order_count: string;   // pg returns int as string when using ::text — cast below
  revenue: string;
  profit: string;
}

// ─── Granularity → pg DATE_TRUNC unit ────────────────────────────────────────

const GRAN_TRUNC: Record<Granularity, string> = {
  daily:   'day',
  weekly:  'week',
  monthly: 'month',
};

// ─── Default date helpers ─────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export interface GetMixParams {
  from?: string;         // YYYY-MM-DD, default = 45 days ago
  to?: string;           // YYYY-MM-DD, default = today
  gran?: Granularity;    // default = 'daily'
}

export async function getMixData(params: GetMixParams = {}): Promise<MixData> {
  const from  = params.from ?? isoDate(daysAgo(45));
  const to    = params.to   ?? isoDate(new Date());
  const gran  = params.gran ?? 'daily';
  const trunc = GRAN_TRUNC[gran];

  // Safe string interpolation — `trunc` comes from a whitelist above.
  //
  // Contribution profit = commission + delivery_fee + service_fee
  //                       − (trip.courier_payout_eur / orders_in_trip)
  //
  // tc subquery counts all orders per trip so the full trip cost is spread
  // evenly regardless of which orders fall inside the query window.
  // Orders with no trip (active/pending) get 0 allocated courier cost.
  const rows = await query<MixRow>(
    `SELECT
       DATE_TRUNC('${trunc}', o.created_at AT TIME ZONE 'Europe/Helsinki')::date AS bucket,
       o.merchant_group,
       COUNT(*)                                                                   AS order_count,
       COALESCE(SUM(o.subtotal_eur),    0)::float8                                AS revenue,
       COALESCE(SUM(
         o.commission_eur
         + o.delivery_fee_eur
         + o.service_fee_eur
         - COALESCE(t.courier_payout_eur / NULLIF(tc.order_count, 0), 0)
       ), 0)::float8                                                              AS profit
     FROM orders o
     LEFT JOIN trips t
       ON t.id = o.trip_id
     LEFT JOIN (
       SELECT trip_id, COUNT(*)::float8 AS order_count
       FROM   orders
       WHERE  trip_id IS NOT NULL
       GROUP  BY trip_id
     ) tc ON tc.trip_id = o.trip_id
     WHERE
       o.created_at >= $1::date::timestamptz
       AND o.created_at <  ($2::date + INTERVAL '1 day')::timestamptz
       AND o.status NOT IN ('cancelled','failed')
     GROUP BY 1, 2
     ORDER BY 1, 2`,
    [from, to],
  );

  // ── Pivot rows into per-bucket data points ──

  // Map<bucket-iso-string, MixDayPoint>
  const bucketMap = new Map<string, MixDayPoint>();

  for (const row of rows) {
    // pg returns DATE as a JS Date in UTC midnight
    const dateKey = isoDate(row.bucket);

    if (!bucketMap.has(dateKey)) {
      bucketMap.set(dateKey, {
        date:        dateKey,
        totalOrders: 0,
        mix:         ZERO_SEGS(),
        segOrders:   ZERO_SEGS(),
        segRevenue:  ZERO_SEGS(),
        segProfit:   ZERO_SEGS(),
      });
    }

    const point  = bucketMap.get(dateKey)!;
    const group  = row.merchant_group as Group;
    const nOrds  = parseInt(row.order_count as unknown as string, 10);
    const rev    = typeof row.revenue === 'number' ? row.revenue : parseFloat(row.revenue as unknown as string);
    const profit = typeof row.profit  === 'number' ? row.profit  : parseFloat(row.profit  as unknown as string);

    point.segOrders[group]  = nOrds;
    point.segRevenue[group] = Math.round(rev    * 100) / 100;
    point.segProfit[group]  = Math.round(profit * 100) / 100;
    point.totalOrders      += nOrds;
  }

  // ── Compute mix fractions ──
  const days: MixDayPoint[] = Array.from(bucketMap.values()).map(point => {
    const { totalOrders, segOrders } = point;
    if (totalOrders > 0) {
      for (const g of GROUPS) {
        point.mix[g] = Math.round((segOrders[g] / totalOrders) * 10000) / 10000;
      }
    }
    return point;
  });

  const totalOrders = days.reduce((sum, d) => sum + d.totalOrders, 0);

  return { from, to, granularity: gran, totalOrders, days };
}
