import { query } from '../lib/db.js';

export interface MerchantSummary {
  id:             string;
  name:           string;
  group:          string;
  status:         string;
  lat:            string;
  lng:            string;
  address:        string;
  commission_rate: string;
  prep_time_estimate_min: number;
}

export async function listMerchants(group?: string): Promise<MerchantSummary[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (group) {
    conditions.push('merchant_group = $1::merchant_group');
    values.push(group);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return query<MerchantSummary>(
    `SELECT id,
            name,
            merchant_group::text AS group,
            status,
            lat::text,
            lng::text,
            address,
            commission_rate::text,
            prep_time_estimate_min
       FROM merchants
       ${where}
      ORDER BY name`,
    values,
  );
}

export async function getMerchantById(id: string): Promise<MerchantSummary | null> {
  const rows = await query<MerchantSummary>(
    `SELECT id, name, merchant_group::text AS group, status,
            lat::text, lng::text, address, commission_rate::text, prep_time_estimate_min
       FROM merchants WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}
