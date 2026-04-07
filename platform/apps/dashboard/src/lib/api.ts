// ─── Thin API client ──────────────────────────────────────────────────────────
// All calls go to the @ecobit/api server.
// Auth is bearer-token based; token is set via NEXT_PUBLIC_ADMIN_TOKEN.
//
// @provisional: replace with a proper auth flow (login page + httpOnly cookie)
// in a future step. The NEXT_PUBLIC_ prefix makes the token visible in browser
// JS — acceptable for a local dev internal tool, not for production.

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function base(): string {
  return (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001').replace(/\/$/, '');
}

function token(): string {
  return process.env['NEXT_PUBLIC_ADMIN_TOKEN'] ?? '';
}

type QueryParams = Record<string, string | number | undefined | null>;

/** Build a URL string from path + optional query params, dropping undefined/null values. */
function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(path, base() + '/');
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** Perform an authenticated GET and return the parsed JSON body. */
export async function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token()}` },
    // Disable Next.js data cache for all analytics/order data — always fresh
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let message = `${res.status} ${res.statusText}`;
    try {
      const parsed = JSON.parse(body) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch { /* keep default */ }
    throw new ApiError(res.status, `[${path}] ${message}`);
  }

  return res.json() as Promise<T>;
}

// ─── Date helpers (shared across pages) ──────────────────────────────────────

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  return d;
}

export function startOfYear(): Date {
  const d = new Date();
  d.setMonth(0, 1);
  return d;
}

export function today(): string {
  return toISODate(new Date());
}

// ─── Currency formatter ───────────────────────────────────────────────────────

export function fmtEur(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return `€${v.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Date formatter ───────────────────────────────────────────────────────────

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fi-FI', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}
