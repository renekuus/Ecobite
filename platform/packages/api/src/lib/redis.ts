import Redis from 'ioredis';

// ─── Singleton client (optional) ─────────────────────────────────────────────
// Redis is used for caching and real-time features.
// If REDIS_URL is not set the server starts in degraded mode:
//   - caches are bypassed (all reads return null)
//   - courier location writes are no-ops
// Everything else works normally against PostgreSQL.

let _redis: Redis | null = null;
let _redisUnavailable = false; // true if URL missing or connection failed at startup

export function getRedis(): Redis | null {
  if (_redisUnavailable) return null;

  if (!_redis) {
    const url = process.env['REDIS_URL'];
    if (!url) {
      _redisUnavailable = true;
      return null;
    }

    _redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    _redis.on('error', (err) => {
      // Log once, then flip to unavailable so subsequent calls skip Redis
      if (!_redisUnavailable) {
        console.error('[redis] connection error — switching to no-cache mode:', (err as Error).message);
        _redisUnavailable = true;
      }
    });

    _redis.on('connect', () => {
      _redisUnavailable = false;
      console.info('[redis] connected');
    });
  }
  return _redis;
}

// ─── Typed helpers — all safe to call when Redis is unavailable ───────────────

/** Set a JSON value with optional TTL in seconds. No-op if Redis unavailable. */
export async function setJson<T>(key: string, value: T, ttlSec?: number): Promise<void> {
  const client = getRedis();
  if (!client) return;
  const serialised = JSON.stringify(value);
  if (ttlSec !== undefined) {
    await client.set(key, serialised, 'EX', ttlSec);
  } else {
    await client.set(key, serialised);
  }
}

/** Get a JSON value. Returns null if key missing or Redis unavailable. */
export async function getJson<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  const raw = await client.get(key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

/** Delete one or more keys. No-op if Redis unavailable. */
export async function del(...keys: string[]): Promise<void> {
  const client = getRedis();
  if (!client || keys.length === 0) return;
  await client.del(...keys);
}

/** Gracefully close the Redis connection (called on SIGTERM). */
export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}

// ─── Well-known key builders ──────────────────────────────────────────────────

export const Keys = {
  /** Active courier location: { lat, lng, updatedAt } */
  courierLocation: (courierId: string) => `courier:${courierId}:location`,

  /** Refresh-token blocklist entry (value = '1', TTL = token lifetime). */
  refreshTokenBlocklist: (jti: string) => `rt:blocklist:${jti}`,

  /** Order state cache (TTL = 60 s). */
  orderCache: (orderId: string) => `order:${orderId}:cache`,
} as const;
