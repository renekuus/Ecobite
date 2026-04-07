# @ecobit/dashboard — Ops Dashboard

Next.js 14 thin client consuming the `@ecobit/api` server.

---

## Quick local setup

### Prerequisites
- API running: `cd platform/packages/api && pnpm dev` (starts on port 3001)
- Database seeded: see `packages/db/README.md`
- Node.js 20+ / pnpm 9+

### 1 — Install

```bash
# from repo root
pnpm install
```

### 2 — Configure env

```bash
cp .env.local.example .env.local
```

Edit `.env.local` — only `NEXT_PUBLIC_API_URL` is needed (defaults to `http://localhost:3001`).

### 3 — Start dashboard

```bash
cd platform/apps/dashboard
pnpm dev
# → http://localhost:3002
```

### 4 — Sign in

Open http://localhost:3002 — you'll be redirected to `/login`.

Use the admin credentials set in the API `.env`:
```
Email:    admin@ecobitedemo.fi
Password: devadminpassword
```

Tokens are stored in `eb_at` / `eb_rt` cookies and auto-refreshed on expiry.

---

## Pages

| Route    | Description |
|----------|-------------|
| `/`      | Dashboard home — 30-day KPI cards + API health status |
| `/live`  | Live Operations — active orders, couriers online, active trips |
| `/orders`| Orders table with status filter + pagination + expand row + cancel/flag actions |
| `/mix`   | Mix & Migration — stacked bar chart + period picker + segment table |

---

## Period picker (Mix page)

| Button       | Date range      | Granularity |
|--------------|-----------------|-------------|
| Today        | today           | daily       |
| Last 7 Days  | -6d → today     | daily       |
| This Month   | 1st → today     | daily       |
| Last 3 Months| -89d → today    | weekly      |
| This Year    | Jan 1 → today   | monthly     |
| Custom       | user-defined    | auto        |

---

## Auth flow

| Mechanism | Detail |
|-----------|--------|
| Login     | POST `/api/v1/auth/login` → receives access + refresh tokens |
| Storage   | Non-httpOnly cookies `eb_at` (14 min) and `eb_rt` (29 days) |
| Middleware| `src/middleware.ts` — redirects to `/login` if `eb_at` absent |
| Refresh   | Auto-triggered on 401 in `api.ts`, then request retried once |
| Logout    | Clears cookies + calls `POST /api/v1/auth/logout` (best-effort) |

---

## Operator actions (Orders page)

| Action | Route | Behaviour |
|--------|-------|-----------|
| 🚩 Flag   | `POST /api/v1/orders/:id/flag`   | Sets `urgency=red`, appends note |
| 🚩 Unflag | `POST /api/v1/orders/:id/unflag` | Resets `urgency=green` |
| ✕ Cancel  | `POST /api/v1/orders/:id/cancel` | Transitions order to `cancelled`, inserts order_event |
