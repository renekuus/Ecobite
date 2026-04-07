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

interface CourierRow {
  id: string;
  email: string;
  name: string;
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

  // ── 1. Merchant user ──
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
        name: mu.email, // merchant_users table has no separate name column
        role,
        merchantId: mu.merchant_id,
      },
    };
  }

  // ── 2. Courier ──
  const courierRows = await query<CourierRow>(
    `SELECT id, email, name, password_hash
       FROM couriers
      WHERE email = $1
      LIMIT 1`,
    [lowerEmail],
  );

  if (courierRows.length > 0) {
    const courier = courierRows[0]!;
    const valid = await bcrypt.compare(password, courier.password_hash);
    if (!valid) return null;

    const { token: refreshToken } = signRefreshToken(courier.id, 'courier');
    return {
      accessToken: signAccessToken(courier.id, 'courier'),
      refreshToken,
      actor: {
        id: courier.id,
        email: courier.email,
        name: courier.name,
        role: 'courier',
      },
    };
  }

  // ── 3. Admin (@provisional: env-based credentials) ──
  const adminEmail    = process.env['ADMIN_EMAIL'];
  const adminPassword = process.env['ADMIN_PASSWORD'];

  if (adminEmail && adminPassword && lowerEmail === adminEmail.toLowerCase()) {
    if (password !== adminPassword) return null;
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

  return null;
}
