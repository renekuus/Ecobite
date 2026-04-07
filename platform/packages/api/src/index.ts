import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { getPool, closePool } from './lib/db.js';
import { getRedis, closeRedis } from './lib/redis.js';
import authRoutes      from './routes/auth.js';
import ordersRoutes    from './routes/orders.js';
import merchantsRoutes from './routes/merchants.js';
import customersRoutes from './routes/customers.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes     from './routes/admin.js';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const IS_DEV = process.env['NODE_ENV'] !== 'production';
const PORT   = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST   = process.env['HOST'] ?? '0.0.0.0';

async function bootstrap(): Promise<void> {
  // ── Fastify instance ──
  const fastify = Fastify({
    logger: {
      level: IS_DEV ? 'info' : 'warn',
      ...(IS_DEV && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
    },
    trustProxy: !IS_DEV,
  });

  // ── CORS ──
  await fastify.register(cors, {
    origin: IS_DEV ? true : (process.env['CORS_ORIGIN'] ?? false),
    credentials: true,
  });

  // ── Rate limiting (global) ──
  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Too many requests — slow down.' }),
  });

  // ── Health check (no auth) ──
  fastify.get('/health', async () => ({
    status: 'ok',
    ts: new Date().toISOString(),
    redis: getRedis() !== null ? 'connected' : 'unavailable (degraded mode)',
  }));

  // ── API v1 routes ──
  await fastify.register(
    async (v1) => {
      await v1.register(authRoutes,      { prefix: '/auth' });
      await v1.register(ordersRoutes,    { prefix: '/orders' });
      await v1.register(merchantsRoutes, { prefix: '/merchants' });
      await v1.register(customersRoutes, { prefix: '/customers' });
      await v1.register(analyticsRoutes, { prefix: '/analytics' });
      await v1.register(adminRoutes,     { prefix: '/admin' });
    },
    { prefix: '/api/v1' },
  );

  // ── Warm up DB connection — required to start ──
  try {
    const { rows } = await getPool().query<{ now: Date }>('SELECT NOW() AS now');
    fastify.log.info(`[db] pool ready (server time: ${rows[0]?.now?.toISOString() ?? '?'})`);
  } catch (err) {
    fastify.log.error({ err }, '[db] failed to connect — check DATABASE_URL');
    process.exit(1);
  }

  // ── Warm up Redis — optional ──
  const redis = getRedis();
  if (redis) {
    try {
      await redis.ping();
      fastify.log.info('[redis] ready');
    } catch {
      fastify.log.warn('[redis] ping failed — running in no-cache mode');
    }
  } else {
    fastify.log.info('[redis] REDIS_URL not set — running in no-cache mode (dev OK)');
  }

  // ── Start ──
  await fastify.listen({ port: PORT, host: HOST });

  // ── Graceful shutdown ──
  const shutdown = async (signal: string): Promise<void> => {
    fastify.log.info(`[shutdown] received ${signal}`);
    await fastify.close();
    await Promise.allSettled([closePool(), closeRedis()]);
    process.exit(0);
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT',  () => void shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  console.error('[fatal] failed to start:', err);
  process.exit(1);
});
