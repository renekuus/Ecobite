import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { login } from '../services/authService.js';
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
} from '../lib/jwt.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const LoginBody = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const RefreshBody = z.object({
  refreshToken: z.string().min(1),
});

type LoginBodyType   = z.infer<typeof LoginBody>;
type RefreshBodyType = z.infer<typeof RefreshBody>;

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/auth/login
   *
   * Accepts email + password, returns access + refresh tokens and actor info.
   * Works for merchant users, couriers and the provisional admin account.
   */
  fastify.post(
    '/login',
    async (
      req: FastifyRequest<{ Body: LoginBodyType }>,
      reply: FastifyReply,
    ) => {
      const parsed = LoginBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, password } = parsed.data;
      const result = await login(email, password);

      if (!result) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      return reply.code(200).send({
        accessToken:  result.accessToken,
        refreshToken: result.refreshToken,
        actor:        result.actor,
      });
    },
  );

  /**
   * POST /api/v1/auth/refresh
   *
   * Exchange a valid refresh token for a new access token (+ rotated refresh token).
   * Body: { refreshToken: string }
   */
  fastify.post(
    '/refresh',
    async (
      req: FastifyRequest<{ Body: RefreshBodyType }>,
      reply: FastifyReply,
    ) => {
      const parsed = RefreshBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'refreshToken is required' });
      }

      let payload;
      try {
        payload = verifyRefreshToken(parsed.data.refreshToken);
      } catch {
        return reply.code(401).send({ error: 'Invalid or expired refresh token' });
      }

      // Issue fresh token pair
      const newAccessToken              = signAccessToken(payload.sub, payload.role, (payload as { merchantId?: string }).merchantId);
      const { token: newRefreshToken }  = signRefreshToken(payload.sub, payload.role);

      return reply.code(200).send({
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
      });
    },
  );

  /**
   * POST /api/v1/auth/logout
   *
   * Stateless logout — client discards tokens. Returns 204.
   * Future: add refresh token to blocklist (Redis).
   */
  fastify.post('/logout', async (_req, reply) => {
    return reply.code(204).send();
  });
}
