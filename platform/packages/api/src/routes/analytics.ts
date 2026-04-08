import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getMixData, type Granularity } from '../services/analyticsService.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const MixQuery = z.object({
  from: ISO_DATE.optional(),
  to:   ISO_DATE.optional(),
  gran: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/analytics/mix
   *
   * Returns order-mix evolution data grouped by merchant_group, bucketed by
   * granularity.  Response shape is designed to feed directly into the
   * Mix & Migration chart (same structure as _getMixEvolution() in the sim).
   *
   * Auth: requires admin role.
   *
   * Query params:
   *   from  — start date inclusive, YYYY-MM-DD (default: 45 days ago)
   *   to    — end date inclusive,   YYYY-MM-DD (default: today)
   *   gran  — daily | weekly | monthly          (default: daily)
   *
   * Response:
   * {
   *   from: "2026-03-01", to: "2026-04-07", granularity: "daily",
   *   totalOrders: 762,
   *   days: [
   *     {
   *       date: "2026-03-01",
   *       totalOrders: 15,
   *       mix: { qsr: 0.4667, restaurant: 0.2, darkstore: 0.2, other: 0.1333 },
   *       segOrders:  { qsr: 7, restaurant: 3, darkstore: 3, other: 2 },
   *       segRevenue: { qsr: 238.0, restaurant: 150.0, darkstore: 142.5, other: 100.0 },
   *       segProfit:  { qsr: 23.8, restaurant: 28.5, darkstore: 42.75, other: 11.5 }
   *     },
   *     ...
   *   ]
   * }
   */
  fastify.get(
    '/mix',
    {
      preHandler: [
        requireAuth,
        requireRole('admin'),
      ],
    },
    async (
      req: FastifyRequest<{ Querystring: z.infer<typeof MixQuery> }>,
      reply: FastifyReply,
    ) => {
      const parsed = MixQuery.safeParse(req.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error:   'Validation error',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { from, to, gran } = parsed.data;

      // Guard: from must not be after to
      if (from && to && from > to) {
        return reply.code(400).send({ error: '`from` must be on or before `to`' });
      }

      const data = await getMixData({ from, to, gran: gran as Granularity });
      return reply.code(200).send(data);
    },
  );

  /**
   * GET /api/v1/analytics/summary
   *
   * High-level KPIs for a period — total orders, GMV, gross profit, avg order value.
   * Auth: requires admin role.
   *
   * Query params: same from / to as /mix
   */
  fastify.get(
    '/summary',
    {
      preHandler: [
        requireAuth,
        requireRole('admin'),
      ],
    },
    async (
      req: FastifyRequest<{ Querystring: { from?: string; to?: string } }>,
      reply: FastifyReply,
    ) => {
      const from = req.query.from ?? (() => {
        const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
      })();
      const to   = req.query.to ?? new Date().toISOString().slice(0, 10);

      // Compute previous period (same duration, immediately before current period)
      const fromDate   = new Date(from + 'T00:00:00Z');
      const toDate     = new Date(to   + 'T00:00:00Z');
      const periodDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
      const prevToDate   = new Date(fromDate.getTime() - 86_400_000);            // from − 1 day
      const prevFromDate = new Date(prevToDate.getTime() - (periodDays - 1) * 86_400_000);
      const prevFrom = prevFromDate.toISOString().slice(0, 10);
      const prevTo   = prevToDate.toISOString().slice(0, 10);

      const { query } = await import('../lib/db.js');

      // Current period aggregation
      const [row] = await query<{
        total_orders: string;
        delivered_orders: string;
        cancelled_orders: string;
        total_gmv: string;
        total_commission: string;
        total_gross_profit: string;
        avg_order_value: string;
      }>(
        `SELECT
           COUNT(*)                                             AS total_orders,
           COUNT(*) FILTER (WHERE status = 'delivered')        AS delivered_orders,
           COUNT(*) FILTER (WHERE status = 'cancelled')        AS cancelled_orders,
           COALESCE(SUM(subtotal_eur),     0)::float8          AS total_gmv,
           COALESCE(SUM(commission_eur),   0)::float8          AS total_commission,
           COALESCE(SUM(gross_profit_eur), 0)::float8          AS total_gross_profit,
           COALESCE(AVG(subtotal_eur) FILTER (WHERE status NOT IN ('cancelled','failed')), 0)::float8
                                                               AS avg_order_value
         FROM orders
         WHERE created_at >= $1::date::timestamptz
           AND created_at <  ($2::date + INTERVAL '1 day')::timestamptz`,
        [from, to],
      );

      // Previous period GMV — single value, used for growth indicator
      const [prevRow] = await query<{ prev_gmv: string }>(
        `SELECT COALESCE(SUM(subtotal_eur), 0)::float8 AS prev_gmv
           FROM orders
          WHERE created_at >= $1::date::timestamptz
            AND created_at <  ($2::date + INTERVAL '1 day')::timestamptz`,
        [prevFrom, prevTo],
      );

      if (!row) return reply.code(200).send({});

      return reply.code(200).send({
        period:              { from, to },
        totalOrders:         parseInt(row.total_orders, 10),
        deliveredOrders:     parseInt(row.delivered_orders, 10),
        cancelledOrders:     parseInt(row.cancelled_orders, 10),
        totalGmvEur:         Math.round(parseFloat(row.total_gmv) * 100) / 100,
        previousPeriodGmvEur: Math.round(parseFloat(prevRow?.prev_gmv ?? '0') * 100) / 100,
        totalCommissionEur:  Math.round(parseFloat(row.total_commission) * 100) / 100,
        totalGrossProfitEur: Math.round(parseFloat(row.total_gross_profit) * 100) / 100,
        avgOrderValueEur:    Math.round(parseFloat(row.avg_order_value) * 100) / 100,
      });
    },
  );
}
