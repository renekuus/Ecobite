import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { listCustomers, getCustomerById } from '../services/customerService.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ListCustomersQuery = z.object({
  search: z.string().max(100).optional(),
  limit:  z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

type ListCustomersQueryType = z.infer<typeof ListCustomersQuery>;

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function customersRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/customers
   *
   * Returns a paginated list of customers.
   * Admin only — ops dashboard use.
   *
   * Query params:
   *   search  — name/email substring filter
   *   limit   — page size (default 50, max 200)
   *   offset  — pagination offset (default 0)
   */
  fastify.get(
    '/',
    { preHandler: [requireAuth, requireAdmin] },
    async (
      req: FastifyRequest<{ Querystring: ListCustomersQueryType }>,
      reply: FastifyReply,
    ) => {
      const parsed = ListCustomersQuery.safeParse(req.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { search, limit, offset } = parsed.data;
      const result = await listCustomers({ search, limit, offset });

      return reply.code(200).send({
        customers: result.customers,
        total:     result.total,
        limit,
        offset,
      });
    },
  );

  /**
   * GET /api/v1/customers/:id
   *
   * Fetch a single customer by UUID.
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
        return reply.code(400).send({ error: 'Invalid customer id format' });
      }

      const customer = await getCustomerById(id);
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      return reply.code(200).send({ customer });
    },
  );
}
