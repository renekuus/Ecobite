// ─── Cookie-based auth for the ops dashboard ─────────────────────────────────
//
// Tokens are stored in non-httpOnly cookies so both:
//  1. Next.js Edge middleware can read them to protect routes
//  2. Client-side code can include the access token as a Bearer header
//
// Cookie names:
//   eb_at  — access token  (15 min TTL, mirrors JWT expiry)
//   eb_rt  — refresh token (30 day TTL, mirrors JWT expiry)

const BASE = (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001').replace(/\/$/, '');

const COOKIE_AT = 'eb_at';
const COOKIE_RT = 'eb_rt';

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function setCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]!) : null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}

// ─── Token access ─────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return getCookie(COOKIE_AT);
}

/** Decode the JWT payload without verification — only for display purposes. */
export function getActorFromToken(): { email: string; role: string; name: string } | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const b64 = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64)) as Record<string, unknown>;
    const email = typeof payload['email'] === 'string' ? payload['email'] : null;
    const role  = typeof payload['role']  === 'string' ? payload['role']  : 'admin';
    const name  = typeof payload['name']  === 'string' ? payload['name']  : '';
    if (!email) return null;
    return { email, role, name };
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string): void {
  setCookie(COOKIE_AT, accessToken,  14 * 60);       // 14 min (just under 15 min JWT TTL)
  setCookie(COOKIE_RT, refreshToken, 29 * 24 * 3600); // 29 days
}

export function clearTokens(): void {
  deleteCookie(COOKIE_AT);
  deleteCookie(COOKIE_RT);
}

// ─── Login ────────────────────────────────────────────────────────────────────

export interface LoginActor {
  id:    string;
  email: string;
  name:  string;
  role:  string;
}

export interface LoginResult {
  actor: LoginActor;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Login failed' })) as { error?: string };
    throw new Error(body.error ?? 'Login failed');
  }

  const data = await res.json() as { accessToken: string; refreshToken: string; actor: LoginActor };
  setTokens(data.accessToken, data.refreshToken);
  return { actor: data.actor };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

let _refreshing: Promise<string> | null = null;

export async function refreshTokens(): Promise<string> {
  // Deduplicate concurrent refresh attempts
  if (_refreshing) return _refreshing;

  _refreshing = (async () => {
    const rt = getCookie(COOKIE_RT);
    if (!rt) throw new Error('No refresh token');

    const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: rt }),
    });

    if (!res.ok) {
      clearTokens();
      throw new Error('Refresh failed — please log in again');
    }

    const data = await res.json() as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  })().finally(() => { _refreshing = null; });

  return _refreshing;
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const at = getAccessToken();
  clearTokens();
  // Best-effort server-side logout (stateless — just clears tokens locally)
  if (at) {
    await fetch(`${BASE}/api/v1/auth/logout`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${at}` },
    }).catch(() => { /* ignore */ });
  }
}
