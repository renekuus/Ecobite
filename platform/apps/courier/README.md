# @ecobit/courier — Courier Mobile App

React Native (Expo) application. iOS + Android from a single codebase.

## Planned screens

- **Home** — shift start/end, active trip summary
- **Trip** — stop-by-stop navigation, pickup/dropoff confirmation, live map
- **Earnings** — shift history, payout summary
- **Profile** — account, vehicle type, support

## Key integrations

- Mapbox SDK for turn-by-turn routing
- Background location updates (even when app is backgrounded)
- Push notifications (FCM + APNs) for trip assignments
- WebSocket for real-time trip updates

## Setup (once dependencies are wired)

```bash
pnpm install
pnpm start
```
