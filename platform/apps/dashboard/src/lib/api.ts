// ─── Thin API client ──────────────────────────────────────────────────────────
// All calls go to the @ecobit/api server.
// Auth: Bearer token from eb_at cookie; auto-refreshes on 401.

import { getAccessToken, refreshTokens, clearTokens } from './auth';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function base(): string {
  return (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001').replace(/\/$/, '');
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

// ─── Core fetch with auto-refresh ────────────────────────────────────────────

async function apiFetch(url: string, init: RequestInit, retry = true): Promise<Response> {
  const at = getAccessToken();
  const headers = new Headers(init.headers ?? {});
  if (at) headers.set('Authorization', `Bearer ${at}`);

  const res = await fetch(url, { ...init, headers, cache: 'no-store' });

  // Auto-refresh once on 401, then re-try
  if (res.status === 401 && retry) {
    try {
      const newAt = await refreshTokens();
      headers.set('Authorization', `Bearer ${newAt}`);
      return fetch(url, { ...init, headers, cache: 'no-store' });
    } catch {
      // Refresh failed — clear tokens and throw so caller can redirect to login
      clearTokens();
      throw new ApiError(401, 'Session expired — please log in again');
    }
  }

  return res;
}

async function handleResponse<T>(res: Response, path: string): Promise<T> {
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

// ─── Public helpers ───────────────────────────────────────────────────────────

/** Perform an authenticated GET and return the parsed JSON body. */
export async function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  const url = buildUrl(path, params);
  const res = await apiFetch(url, { method: 'GET' });
  return handleResponse<T>(res, path);
}

/** Perform an authenticated POST and return the parsed JSON body. */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const url = buildUrl(path);
  const res = await apiFetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res, path);
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
