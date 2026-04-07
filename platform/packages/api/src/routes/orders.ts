import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { OrderStatus } from '@ecobit/shared';
import { requireAuth, requireRole, requireAdmin } from '../middleware/auth.js';
import { listOrders, getOrderById, cancelOrder, flagOrder, unflagOrder } from '../services/orderService.js';

// ─── Query schema ─────────────────────────────────────────────────────────────

// Lowercase values match the PostgreSQL order_status enum and what API consumers send.
// z.nativeEnum(OrderStatus) rejected them because the TS enum uses uppercase values.
const DB_ORDER_STATUSES = [
  'placed', 'confirmed', 'preparing', 'ready',
  'assigned', 'picked_up', 'delivering', 'delivered',
  'cancelled', 'failed',
] as const;

const ListOrdersQuery = z.object({
  status:     z.enum(DB_ORDER_STATUSES).optional(),
  merchantId: z.string().uuid().optional(),
  courierId:  z.string().uuid().optional(),
  limit:  z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const CancelBody = z.object({
  reason: z.string().max(500).optional(),
});

const FlagBody = z.object({
  note: z.string().max(500).optional(),
});

type ListOrdersQueryType = z.infer<typeof ListOrdersQuery>;
type CancelBodyType      = z.infer<typeof CancelBody>;
type FlagBodyType        = z.infer<typeof FlagBody>;

// ─── UUID guard ───────────────────────────────────────────────────────────────

function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function ordersRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/orders
   *
   * Returns a paginated list of orders with embedded merchant + customer identity.
   * Accessible to: admin, merchant_owner, merchant_staff, courier (filtered to own orders).
   */
  fastify.get(
    '/',
    {
      preHandler: [
        requireAuth,
        requireRole('admin', 'merchant_owner', 'merchant_staff', 'courier'),
      ],
    },
    async (
      req: FastifyRequest<{ Querystring: ListOrdersQueryType }>,
      reply: FastifyReply,
    ) => {
      const parsed = ListOrdersQuery.safeParse(req.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { status, merchantId, courierId, limit, offset } = parsed.data;
      const actor = req.actor;

      const effectiveMerchantId =
        actor.role === 'merchant_owner' || actor.role === 'merchant_staff'
          ? (actor.merchantId ?? merchantId)
          : merchantId;

      const effectiveCourierId =
        actor.role === 'courier' ? actor.sub : courierId;

      const result = await listOrders({
        status: status as OrderStatus | undefined,
        merchantId: effectiveMerchantId,
        courierId:  effectiveCourierId,
        limit,
        offset,
      });

      return reply.code(200).send({
        orders: result.orders,
        total:  result.total,
        limit,
        offset,
      });
    },
  );

  /**
   * GET /api/v1/orders/:id
   *
   * Fetch a single order by UUID (with embedded merchant + customer).
   */
  fastify.get(
    '/:id',
    { preHandler: requireAuth },
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = req.params;
      if (!isUUID(id)) return reply.code(400).send({ error: 'Invalid order id format' });

      const order = await getOrderById(id);
      if (!order) return reply.code(404).send({ error: 'Order not found' });

      const actor = req.actor;
      if (actor.role === 'courier' && order.courier_id !== actor.sub) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      if (
        (actor.role === 'merchant_owner' || actor.role === 'merchant_staff') &&
        order.merchant_id !== actor.merchantId
      ) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      return reply.code(200).send({ order });
    },
  );

  /**
   * POST /api/v1/orders/:id/cancel
   *
   * Cancel an order that is not yet in a terminal state.
   * Admin only.
   */
  fastify.post(
    '/:id/cancel',
    { preHandler: [requireAuth, requireAdmin] },
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: CancelBodyType }>,
      reply: FastifyReply,
    ) => {
      const { id } = req.params;
      if (!isUUID(id)) return reply.code(400).send({ error: 'Invalid order id format' });

      const parsed = CancelBody.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
      }

      const result = await cancelOrder(id, req.actor.sub, parsed.data.reason);
      if (!result.ok) {
        return reply.code(409).send({ error: result.error });
      }

      return reply.code(200).send({ ok: true });
    },
  );

  /**
   * POST /api/v1/orders/:id/flag
   *
   * Flag an order as urgent (urgency = red).
   * Admin only.
   */
  fastify.post(
    '/:id/flag',
    { preHandler: [requireAuth, requireAdmin] },
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: FlagBodyType }>,
      reply: FastifyReply,
    ) => {
      const { id } = req.params;
      if (!isUUID(id)) return reply.code(400).send({ error: 'Invalid order id format' });

      const parsed = FlagBody.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
      }

      await flagOrder(id, req.actor.sub, parsed.data.note);
      return reply.code(200).send({ ok: true });
    },
  );

  /**
   * POST /api/v1/orders/:id/unflag
   *
   * Remove urgency flag from an order (urgency = green).
   * Admin only.
   */
  fastify.post(
    '/:id/unflag',
    { preHandler: [requireAuth, requireAdmin] },
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = req.params;
      if (!isUUID(id)) return reply.code(400).send({ error: 'Invalid order id format' });

      await unflagOrder(id);
      return reply.code(200).send({ ok: true });
    },
  );
}
