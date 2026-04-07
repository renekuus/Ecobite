import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { OrderStatus } from '@ecobit/shared';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listOrders, getOrderById } from '../services/orderService.js';

// ─── Query schema ─────────────────────────────────────────────────────────────

const ListOrdersQuery = z.object({
  status:     z.nativeEnum(OrderStatus).optional(),
  merchantId: z.string().uuid().optional(),
  courierId:  z.string().uuid().optional(),
  limit:  z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

type ListOrdersQueryType = z.infer<typeof ListOrdersQuery>;

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function ordersRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/orders
   *
   * Returns a paginated list of orders.
   * Accessible to: admin, merchant_owner, merchant_staff, courier (filtered to own orders).
   *
   * Query params:
   *   status      — filter by order_status enum value
   *   merchantId  — filter by merchant UUID
   *   courierId   — filter by courier UUID
   *   limit       — page size (default 50, max 200)
   *   offset      — pagination offset (default 0)
   *
   * Response:
   *   { orders: OrderRow[], total: number, limit: number, offset: number }
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

      // Scope queries based on actor role:
      //  - merchant users are implicitly scoped to their own merchant
      //  - couriers are implicitly scoped to their own courier_id
      //  - admin sees everything (no implicit filter)
      const effectiveMerchantId =
        actor.role === 'merchant_owner' || actor.role === 'merchant_staff'
          ? (actor.merchantId ?? merchantId)
          : merchantId;

      const effectiveCourierId =
        actor.role === 'courier' ? actor.sub : courierId;

      const result = await listOrders({
        status,
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
   * Fetch a single order by UUID.
   * Accessible to: admin, merchant_owner, merchant_staff, courier (if assigned).
   */
  fastify.get(
    '/:id',
    { preHandler: requireAuth },
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = req.params;

      // Basic UUID format guard
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return reply.code(400).send({ error: 'Invalid order id format' });
      }

      const order = await getOrderById(id);

      if (!order) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Access control: couriers can only see orders assigned to them
      const actor = req.actor;
      if (actor.role === 'courier' && order.courier_id !== actor.sub) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      // Merchant users can only see orders belonging to their merchant
      if (
        (actor.role === 'merchant_owner' || actor.role === 'merchant_staff') &&
        order.merchant_id !== actor.merchantId
      ) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      return reply.code(200).send({ order });
    },
  );
}
