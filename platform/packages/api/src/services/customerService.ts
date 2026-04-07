import { query } from '../lib/db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerSummary {
  id:         string;
  name:       string;
  email:      string;
  phone:      string;
  status:     string;
  created_at: string;
}

export interface ListCustomersParams {
  search?: string;
  limit?:  number;
  offset?: number;
}

export interface ListCustomersResult {
  customers: CustomerSummary[];
  total:     number;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listCustomers(params: ListCustomersParams = {}): Promise<ListCustomersResult> {
  const { search, limit = 50, offset = 0 } = params;

  const conditions: string[] = ["status != 'deleted'"];
  const values: unknown[] = [];
  let p = 1;

  if (search) {
    // trigram index on name + plain ILIKE on email
    conditions.push(`(name ILIKE $${p} OR email ILIKE $${p})`);
    values.push(`%${search}%`);
    p++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  values.push(limit, offset);
  const limitP = p++, offsetP = p;

  interface EnrichedRow extends CustomerSummary { total_count: string; }

  const rows = await query<EnrichedRow>(
    `SELECT id, name, email, phone, status, created_at,
            COUNT(*) OVER () AS total_count
       FROM customers
      ${where}
      ORDER BY name
      LIMIT $${limitP} OFFSET $${offsetP}`,
    values,
  );

  const total     = rows.length > 0 ? parseInt(rows[0]!.total_count, 10) : 0;
  const customers = rows.map(({ total_count: _tc, ...rest }) => rest as CustomerSummary);
  return { customers, total };
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getCustomerById(id: string): Promise<CustomerSummary | null> {
  const rows = await query<CustomerSummary>(
    `SELECT id, name, email, phone, status, created_at
       FROM customers
      WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}
