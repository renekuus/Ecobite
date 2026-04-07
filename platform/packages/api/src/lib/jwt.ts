import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// ─── Config ───────────────────────────────────────────────────────────────────

function secret(envVar: string): string {
  const val = process.env[envVar];
  if (!val) throw new Error(`${envVar} is not set`);
  return val;
}

const ACCESS_EXPIRES_IN  = (process.env['JWT_EXPIRES_IN']         ?? '15m') as string;
const REFRESH_EXPIRES_IN = (process.env['JWT_REFRESH_EXPIRES_IN'] ?? '30d') as string;

// ─── Payload shapes ───────────────────────────────────────────────────────────

export type ActorRole = 'customer' | 'courier' | 'merchant_owner' | 'merchant_staff' | 'admin';

export interface AccessTokenPayload {
  sub: string;        // actor UUID
  role: ActorRole;
  merchantId?: string; // populated for merchant_* roles
  jti: string;
}

export interface RefreshTokenPayload {
  sub: string;
  role: ActorRole;
  jti: string;        // unique — used as blocklist key
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

export function signAccessToken(sub: string, role: ActorRole, merchantId?: string): string {
  const payload: AccessTokenPayload = {
    sub,
    role,
    jti: randomUUID(),
    ...(merchantId ? { merchantId } : {}),
  };
  return jwt.sign(payload, secret('JWT_SECRET'), { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken(sub: string, role: ActorRole): { token: string; jti: string } {
  const jti = randomUUID();
  const payload: RefreshTokenPayload = { sub, role, jti };
  const token = jwt.sign(payload, secret('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_EXPIRES_IN });
  return { token, jti };
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, secret('JWT_SECRET')) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, secret('JWT_REFRESH_SECRET')) as RefreshTokenPayload;
}

// ─── Helper: extract bearer token from Authorization header ──────────────────

export function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
