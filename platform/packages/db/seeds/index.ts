import 'dotenv/config';
import { Pool } from 'pg';
import { seed } from './dev/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set.\n');
  console.error('Usage:');
  console.error('  DATABASE_URL=postgresql://user:pass@localhost:5432/ecobit_dev pnpm seed');
  console.error('  — or —');
  console.error('  Copy .env.example to .env, fill in DATABASE_URL, then run: pnpm seed\n');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    await seed(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
