import type { PoolClient } from 'pg';

// ─── Deterministic PRNG (mulberry32) ─────────────────────────────────────────
// Same algorithm as simulation/dashboard/index.html for consistency.

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// Fixed seed — change only if you want a different deterministic dataset
export const rng = mulberry32(20260301);

// ─── Number helpers ───────────────────────────────────────────────────────────

export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

export function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

export function randInt(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Format a Date as YYYYMMDD (for order numbers). */
export function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Add minutes to a Date, returning a new Date. */
export function addMin(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

/** Return a random Date within [startHour, endHour) on the given calendar day. */
export function randomTimeOnDay(day: Date, startHour: number, endHour: number, rand: () => number): Date {
  const d = new Date(day);
  d.setHours(
    startHour + Math.floor(rand() * (endHour - startHour)),
    Math.floor(rand() * 60),
    Math.floor(rand() * 60),
    0,
  );
  return d;
}

// ─── Distance helper (scaled Euclidean approximation) ────────────────────────

export function legKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return r2(Math.sqrt(dLat * dLat + dLng * dLng));
}

// ─── Batch INSERT helper ──────────────────────────────────────────────────────

/**
 * Multi-row INSERT for an array of plain objects.
 * columns must be in the same order as you want them inserted.
 * Chunks at `chunkSize` rows to stay well under the 65535 param limit.
 */
export async function batchInsert(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
  chunkSize = 400,
): Promise<void> {
  if (rows.length === 0) return;
  const nc = columns.length;

  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values: unknown[] = [];
    const placeholders = chunk.map((row, ri) => {
      columns.forEach(col => values.push(row[col] ?? null));
      return `(${columns.map((_, ci) => `$${ri * nc + ci + 1}`).join(', ')})`;
    });
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`,
      values,
    );
  }
}

// ─── Coordinate jitter ────────────────────────────────────────────────────────

/** Add a small random offset (±radiusDeg) to a lat/lng. */
export function jitter(base: number, radiusDeg: number, rand: () => number): number {
  return r2(base + (rand() - 0.5) * 2 * radiusDeg + 0) as unknown as number;
  // Keep more decimal precision for coordinates
}

export function jitterCoord(base: number, radiusDeg: number, rand: () => number): number {
  return parseFloat((base + (rand() - 0.5) * 2 * radiusDeg).toFixed(6));
}
