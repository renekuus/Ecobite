import bcrypt from 'bcryptjs';
import { query } from '../lib/db.js';
import { signAccessToken, signRefreshToken, ActorRole } from '../lib/jwt.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  actor: {
    id: string;
    email: string;
    name: string;
    role: ActorRole;
    merchantId?: string;
  };
}

// ─── Internal row shapes ──────────────────────────────────────────────────────

interface MerchantUserRow {
  id: string;
  merchant_id: string;
  email: string;
  role: string;
  password_hash: string;
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user by email + password.
 *
 * Strategy:
 *  1. Check merchant_users (owners, staff, view_only)
 *  2. Check couriers
 *  3. Check admin credentials from env (@provisional — replace with proper admin table later)
 *
 * Returns null if credentials are invalid.
 */
export async function login(email: string, password: string): Promise<LoginResult | null> {
  const lowerEmail = email.toLowerCase().trim();

  // ── 1. Admin (@provisional: env-based credentials) ──
  // Checked first — no DB query required.
  const adminEmail    = process.env['ADMIN_EMAIL'];
  const adminPassword = process.env['ADMIN_PASSWORD'];

  if (adminEmail && lowerEmail === adminEmail.toLowerCase()) {
    if (!adminPassword || password !== adminPassword) return null;
    const adminId = 'admin-env';
    const { token: refreshToken } = signRefreshToken(adminId, 'admin');
    return {
      accessToken: signAccessToken(adminId, 'admin'),
      refreshToken,
      actor: {
        id: adminId,
        email: adminEmail,
        name: 'Admin',
        role: 'admin',
      },
    };
  }

  // ── 2. Merchant user ──
  // merchant_users has: id, merchant_id, email, role, password_hash
  const muRows = await query<MerchantUserRow>(
    `SELECT id, merchant_id, email, role, password_hash
       FROM merchant_users
      WHERE email = $1
      LIMIT 1`,
    [lowerEmail],
  );

  if (muRows.length > 0) {
    const mu = muRows[0]!;
    const valid = await bcrypt.compare(password, mu.password_hash);
    if (!valid) return null;

    const role: ActorRole = mu.role === 'owner' ? 'merchant_owner' : 'merchant_staff';
    const { token: refreshToken } = signRefreshToken(mu.id, role);
    return {
      accessToken: signAccessToken(mu.id, role, mu.merchant_id),
      refreshToken,
      actor: {
        id: mu.id,
        email: mu.email,
        name: mu.email, // merchant_users has no separate name column
        role,
        merchantId: mu.merchant_id,
      },
    };
  }

  // couriers table has no password_hash column — courier auth not supported yet.

  return null;
}
