import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, AccessTokenPayload, ActorRole, extractBearer } from '../lib/jwt.js';

// ─── Augment FastifyRequest ───────────────────────────────────────────────────
// Declare via module augmentation so callers can type `req.actor` safely.

declare module 'fastify' {
  interface FastifyRequest {
    actor: AccessTokenPayload;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendUnauthorized(reply: FastifyReply, message = 'Unauthorized'): void {
  void reply.code(401).send({ error: message });
}

function sendForbidden(reply: FastifyReply, message = 'Forbidden'): void {
  void reply.code(403).send({ error: message });
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

/**
 * Fastify preHandler hook — verifies the Bearer access token and attaches
 * the decoded payload to `req.actor`.
 *
 * Usage:
 *   fastify.get('/protected', { preHandler: requireAuth }, handler)
 */
export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = extractBearer(req.headers.authorization);
  if (!token) {
    sendUnauthorized(reply, 'Missing Bearer token');
    return;
  }

  try {
    req.actor = verifyAccessToken(token);
  } catch {
    sendUnauthorized(reply, 'Invalid or expired token');
  }
}

// ─── requireRole ─────────────────────────────────────────────────────────────

/**
 * Returns a preHandler hook that asserts the actor has one of the allowed roles.
 * Must be used after `requireAuth` (either inline or via `preHandler` array).
 *
 * Usage:
 *   { preHandler: [requireAuth, requireRole('admin')] }
 */
export function requireRole(...roles: ActorRole[]) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!req.actor) {
      sendUnauthorized(reply);
      return;
    }
    if (!roles.includes(req.actor.role)) {
      sendForbidden(reply, `Role '${req.actor.role}' is not permitted here`);
    }
  };
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────

/** Shorthand: requireRole('admin'). */
export const requireAdmin = requireRole('admin');

// ─── requireMerchantAccess ────────────────────────────────────────────────────

/**
 * For merchant routes — allows admin OR a merchant user whose merchantId matches
 * the :merchantId URL param.
 */
export async function requireMerchantAccess(
  req: FastifyRequest<{ Params: { merchantId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  if (!req.actor) {
    sendUnauthorized(reply);
    return;
  }
  const { role, merchantId } = req.actor;

  if (role === 'admin') return;

  if ((role === 'merchant_owner' || role === 'merchant_staff') && merchantId === req.params.merchantId) {
    return;
  }

  sendForbidden(reply, 'Access to this merchant is not permitted');
}
