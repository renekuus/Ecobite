# @ecobit/dashboard — Ops Dashboard

Next.js 14 thin client consuming the `@ecobit/api` server.
Replaces the simulation (`/simulation/dashboard/index.html`) with real data.

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

# or from this package
cd platform/apps/dashboard
pnpm install
```

### 2 — Get an admin token

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ecobitedemo.fi","password":"devadminpassword"}' \
  | jq -r .accessToken
```

Copy the token value.

### 3 — Configure env

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ADMIN_TOKEN=<paste token here>
```

### 4 — Start dashboard

```bash
pnpm dev
# → http://localhost:3002
```

---

## Pages

| Route    | Description |
|----------|-------------|
| `/`      | Dashboard home — 30-day KPI cards + API health status |
| `/orders`| Orders table with status filter + pagination + expand row |
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

## What is provisional

| Item | Notes |
|------|-------|
| Auth | Static `NEXT_PUBLIC_ADMIN_TOKEN` env var — add login page + cookie session in a future step |
| Merchant names | Orders table shows `merchant_group` (QSR/Restaurant/…) not merchant name — needs merchants endpoint |
| Customer names | Shows UUID — needs customers endpoint |
| No SSR | All pages are client components (`"use client"`) — can be converted to RSC + streaming later |
| Token expiry | Access tokens expire in 15 min by default — restart dev server or get a new token |
