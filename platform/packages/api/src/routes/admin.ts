import { FastifyInstance, FastifyReply } from 'fastify';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getLiveData } from '../services/liveService.js';

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/admin/live
   *
   * Returns live operational data:
   *  - Active orders (all non-terminal orders), sorted by urgency then age
   *  - Active couriers (status = active | on_shift) with trip/order counts
   *  - Active + recently-completed trips (last 2h)
   *  - Summary KPIs
   *
   * Admin only. No caching — always live.
   */
  fastify.get(
    '/live',
    { preHandler: [requireAuth, requireAdmin] },
    async (_req, reply: FastifyReply) => {
      const data = await getLiveData();
      return reply
        .header('Cache-Control', 'no-store')
        .code(200)
        .send(data);
    },
  );
}
