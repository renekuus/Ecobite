# @ecobit/shared — Shared Types, Enums & Constants

Imported by `@ecobit/api`, `@ecobit/admin`, `@ecobit/courier`, and `@ecobit/merchant`.
No business logic. No dependencies outside TypeScript itself.

## Structure

```
src/
  types/
    order.ts          Order, OrderItem, OrderSummary
    trip.ts           Trip, TripStop
    courier.ts        Courier, CourierShift
    merchant.ts       Merchant, MerchantUser, Product, ProductModifier
    customer.ts       Customer, CustomerAddress
    payment.ts        Payment, Payout
    analytics.ts      MixDataPoint, FinancialSummary, SLASummary

  enums/
    orderStatus.ts    OrderStatus enum
    tripStatus.ts     TripStatus enum
    courierStatus.ts  CourierStatus enum
    merchantGroup.ts  MerchantGroup enum (qsr | restaurant | darkstore | other)
    vehicleType.ts    VehicleType enum

  constants/
    sla.ts            SLA thresholds — mirrors simulation logic (Green/Yellow/Red)
    pricing.ts        Commission rates, delivery fees, avg order values per segment
    trip.ts           AVG_TRIP_SIZE, COURIER_TRIP_COST
    geography.ts      Helsinki bounding box, default map centre
```

## Source of truth relationship with simulation

The constants in this package mirror the business rules that the simulation at
`../../simulation/dashboard/index.html` was built around. When business rules change,
update `constants/` here first, then update the simulation for reference alignment.
