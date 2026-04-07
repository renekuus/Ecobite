import { Pool, PoolClient } from 'pg';

// ─── Singleton pool ───────────────────────────────────────────────────────────

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is not set');

    _pool = new Pool({
      connectionString: url,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    _pool.on('error', (err) => {
      console.error('[db] unexpected pool error', err);
    });
  }
  return _pool;
}

/** Execute a single query against the pool. */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

/**
 * Run a block inside a transaction.
 * If the callback throws the transaction is rolled back automatically.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Gracefully close the pool (called on SIGTERM). */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
