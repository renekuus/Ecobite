import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { login } from '../services/authService.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const LoginBody = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

type LoginBodyType = z.infer<typeof LoginBody>;

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
      // Validate body
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
        // Use the same message for both "user not found" and "wrong password"
        // to avoid user enumeration.
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      return reply.code(200).send({
        accessToken:  result.accessToken,
        refreshToken: result.refreshToken,
        actor:        result.actor,
      });
    },
  );
}
