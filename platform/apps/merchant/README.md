# @ecobit/merchant — Merchant Backend App

React Native (Expo) application for restaurant/darkstore/QSR staff.

## Planned screens

- **Orders** — live incoming order queue, confirm/mark-ready actions
- **Menu** — product management, availability toggles, pricing
- **Analytics** — GMV, order count, avg prep time, revenue by period
- **Settings** — operating hours, delivery fee, minimum order, notifications

## Key integrations

- Push notifications (FCM + APNs) for new orders (loud alert sound)
- Printer integration (receipt printing via Bluetooth/network)
- WebSocket for live order queue updates

## Setup (once dependencies are wired)

```bash
pnpm install
pnpm start
```
