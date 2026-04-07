# @ecobit/admin — Operations Dashboard

Next.js application. Internal tool for EcoBite operations team.

## Replaces

The simulation at `../../simulation/dashboard/index.html` — same domain concepts,
real data from the API instead of PRNG-generated values.

## Planned screens

- **Dashboard** — live map, active orders, courier positions
- **Orders** — sortable/filterable order list with Trip Intelligence expand rows
- **Fleet** — courier list, shift status, live locations
- **Admin** — financials, merchant settings, customer history, Mix & Migration analytics

## Stack

- Next.js 14 (App Router)
- Mapbox GL JS (production maps, replaces Leaflet)
- Recharts or Tremor for analytics charts
- Tailwind CSS

## Setup (once dependencies are wired)

```bash
pnpm install
pnpm dev
```
