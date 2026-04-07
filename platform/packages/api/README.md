# @ecobit/api — REST API

Fastify v4 · Node.js · TypeScript · PostgreSQL · Redis (optional in dev)

---

## Quick local setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ running locally
- Redis (optional — API degrades gracefully without it)

### 1 — Install dependencies

```bash
# from repo root
pnpm install
# or from this package
cd platform/packages/api && pnpm install
```

### 2 — Create the database

```bash
psql -U postgres -c "CREATE DATABASE ecobit_dev;"
psql -U postgres -c "CREATE USER ecobit WITH PASSWORD 'password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ecobit_dev TO ecobit;"
```

### 3 — Run migrations

```bash
cd platform/packages/db
cp .env.example .env   # fill in DATABASE_URL
DATABASE_URL=postgresql://ecobit:password@localhost:5432/ecobit_dev pnpm migrate
```

### 4 — Seed dev data (~2 s)

```bash
DATABASE_URL=postgresql://ecobit:password@localhost:5432/ecobit_dev pnpm seed
# Seeds: 75 customers, 16 merchants, 25 couriers, ~765 orders, ~300 trips, ~5400 events
```

### 5 — Configure the API

```bash
cd platform/packages/api
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL to match your local Postgres
```

### 6 — Start dev server

```bash
pnpm dev
# Fastify listens on http://localhost:3001
# Hot-reloads via tsx watch
```

---

## Endpoints

### Health

```
GET /health
```
No auth. Returns `{ status, ts, redis }`.

---

### Auth

```
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "owner@hesburger-kamppi.ecobitedemo.fi", "password": "devpassword" }
```

Returns `{ accessToken, refreshToken, actor }`.

**Dev credentials (from seed):**

| Role           | Email                                            | Password      |
|----------------|--------------------------------------------------|---------------|
| admin          | admin@ecobitedemo.fi                             | devadminpassword |
| merchant_owner | owner@hesburger-kamppi.ecobitedemo.fi            | devpassword   |
| merchant_owner | owner@ecobitek-darkkallio.ecobitedemo.fi         | devpassword   |
| merchant_staff | staff@hesburger-kamppi.ecobitedemo.fi            | devpassword   |

> Admin email/password come from `.env` — defaults in `.env.example`.

---

### Orders

```
GET /api/v1/orders
Authorization: Bearer <accessToken>
```

Query params:

| Param        | Type         | Default | Notes                                    |
|--------------|--------------|---------|------------------------------------------|
| `status`     | order_status | —       | placed/confirmed/preparing/ready/…       |
| `merchantId` | UUID         | —       | merchant scope (auto-applied for merchant roles) |
| `courierId`  | UUID         | —       | courier scope (auto-applied for courier role) |
| `limit`      | int 1–200    | 50      |                                          |
| `offset`     | int ≥ 0      | 0       |                                          |

Response: `{ orders: OrderRow[], total, limit, offset }`

```
GET /api/v1/orders/:id
Authorization: Bearer <accessToken>
```

Response: `{ order: OrderRow }`

---

### Analytics

```
GET /api/v1/analytics/mix
Authorization: Bearer <accessToken>   (admin only)
```

Query params:

| Param  | Type                           | Default      | Notes               |
|--------|--------------------------------|--------------|---------------------|
| `from` | YYYY-MM-DD                     | 45 days ago  | inclusive           |
| `to`   | YYYY-MM-DD                     | today        | inclusive           |
| `gran` | daily \| weekly \| monthly     | daily        | bucket granularity  |

Response:
```json
{
  "from": "2026-03-01",
  "to": "2026-04-07",
  "granularity": "daily",
  "totalOrders": 762,
  "days": [
    {
      "date": "2026-03-01",
      "totalOrders": 15,
      "mix":        { "qsr": 0.4667, "restaurant": 0.2, "darkstore": 0.2, "other": 0.1333 },
      "segOrders":  { "qsr": 7, "restaurant": 3, "darkstore": 3, "other": 2 },
      "segRevenue": { "qsr": 238.0, "restaurant": 150.0, "darkstore": 142.5, "other": 100.0 },
      "segProfit":  { "qsr": 23.8,  "restaurant": 28.5,  "darkstore": 42.75, "other": 11.5 }
    }
  ]
}
```

```
GET /api/v1/analytics/summary
Authorization: Bearer <accessToken>   (admin only)
```

Query params: `from`, `to` (same as above).

Response: `{ period, totalOrders, deliveredOrders, cancelledOrders, totalGmvEur, totalCommissionEur, totalGrossProfitEur, avgOrderValueEur }`

---

## Testing with curl

```bash
# 1 — get a token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ecobitedemo.fi","password":"devadminpassword"}' \
  | jq -r .accessToken)

# 2 — list orders (most recent 10)
curl -s "http://localhost:3001/api/v1/orders?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3 — mix evolution (last 30 days, weekly buckets)
curl -s "http://localhost:3001/api/v1/analytics/mix?gran=weekly" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4 — summary for March 2026
curl -s "http://localhost:3001/api/v1/analytics/summary?from=2026-03-01&to=2026-03-31" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5 — health (no auth)
curl -s http://localhost:3001/health | jq .
```

---

## Route structure

```
src/routes/
  auth.ts          POST /api/v1/auth/login
  orders.ts        GET  /api/v1/orders, /api/v1/orders/:id
  analytics.ts     GET  /api/v1/analytics/mix, /api/v1/analytics/summary
  customers.ts     (stub — future)
  merchants.ts     (stub — future)
  couriers.ts      (stub — future)
  admin.ts         (stub — future)
  merchant.ts      (stub — future)
```

## Service structure

```
src/services/
  authService.ts       login (merchant_users + couriers + env admin)
  orderService.ts      listOrders(), getOrderById()
  analyticsService.ts  getMixData() — daily/weekly/monthly mix from DB
  order.ts             re-exports orderService (legacy stub)
  trip.ts / sla.ts / pricing.ts / payment.ts / notification.ts / location.ts
                       (stubs — future)
```

---

## What remains provisional

| Item | Notes |
|------|-------|
| Admin auth | Env-var credentials (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) — replace with `admin_users` table |
| Courier auth | `couriers` table has no `password_hash` column — courier login not yet possible via API |
| Refresh tokens | `POST /auth/refresh` not yet implemented |
| Logout / blocklist | Redis blocklist wired but `/auth/logout` route not yet added |
| Order creation | `POST /orders` not yet implemented |
| Merchant app routes | `/merchant/*`, `/couriers/*`, `/customers/*` are stubs |
