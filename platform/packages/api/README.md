# @ecobit/api — REST API

Fastify + Node.js + TypeScript. All business logic lives here — apps are thin clients.

## Route structure

```
src/routes/
  auth.ts          POST /login, /refresh, /logout
  customers.ts     GET|PUT /me, addresses, order history
  merchants.ts     public merchant + product listing
  orders.ts        place order, track (SSE), cancel
  couriers.ts      shift, trips, stop completion, location
  admin.ts         ops dashboard — orders, trips, analytics
  merchant.ts      merchant backend — order queue, confirm/ready
```

## Service structure

```
src/services/
  order.ts         order creation, state machine transitions
  trip.ts          batching algorithm, stop sequencing
  sla.ts           ETA calculation, SLA threshold evaluation
  pricing.ts       delivery fee, surge, commission calculation
  payment.ts       Stripe payment intents
  notification.ts  push (FCM/APNs), SMS, email dispatch
  location.ts      courier location reads/writes (Redis)
```

## Middleware

```
src/middleware/
  auth.ts          JWT verification, role guards
  validate.ts      Zod schema validation
  rateLimit.ts     per-route rate limiting
```

## Background jobs (SQS consumers)

```
src/jobs/
  tripAssignment.ts  polls for READY orders, batches, assigns couriers
  payouts.ts         weekly courier + merchant payout processing
  notifications.ts   retry queue for failed push/SMS/email
```

## Setup (once dependencies are wired)

```bash
cp .env.example .env
pnpm install
pnpm dev
```
