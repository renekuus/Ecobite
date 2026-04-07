import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { listMerchants, getMerchantById } from '../services/merchantService.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ListMerchantsQuery = z.object({
  group: z.enum(['qsr', 'restaurant', 'darkstore', 'other']).optional(),
});

type ListMerchantsQueryType = z.infer<typeof ListMerchantsQuery>;

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function merchantsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/merchants
   *
   * Returns all merchants (optionally filtered by group).
   * Admin only — ops dashboard use.
   *
   * Query params:
   *   group — filter by merchant_group enum value (qsr | restaurant | darkstore | other)
   */
  fastify.get(
    '/',
    { preHandler: [requireAuth, requireAdmin] },
    async (
      req: FastifyRequest<{ Querystring: ListMerchantsQueryType }>,
      reply: FastifyReply,
    ) => {
      const parsed = ListMerchantsQuery.safeParse(req.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const merchants = await listMerchants(parsed.data.group);
      return reply.code(200).send({ merchants });
    },
  );

  /**
   * GET /api/v1/merchants/:id
   *
   * Fetch a single merchant by UUID.
   * Admin only.
   */
  fastify.get(
    '/:id',
    { preHandler: [requireAuth, requireAdmin] },
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = req.params;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return reply.code(400).send({ error: 'Invalid merchant id format' });
      }

      const merchant = await getMerchantById(id);
      if (!merchant) {
        return reply.code(404).send({ error: 'Merchant not found' });
      }

      return reply.code(200).send({ merchant });
    },
  );
}
