import { TripStatus } from '../enums/tripStatus';

export type StopType = 'pickup' | 'dropoff';

/** Address snapshot for a trip stop (frozen at trip creation). */
export interface StopAddressSnapshot {
  street: string;
  city: string;
  lat: number;
  lng: number;
}

export interface TripStop {
  id: string;
  tripId: string;
  orderId: string | null;           // null for depot/hub stops
  merchantId: string | null;        // set for pickup stops
  stopType: StopType;
  sequenceNumber: number;           // 1-based; pickups before dropoffs
  addressSnapshot: StopAddressSnapshot;
  distanceFromPreviousKm: number | null;
  arrivedAt: string | null;
  completedAt: string | null;
}

export interface Trip {
  id: string;                       // UUID
  courierId: string;
  status: TripStatus;
  stops: TripStop[];
  totalKm: number | null;           // set on completion
  courierPayoutEur: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

/** Audit trail entry for a trip status transition. */
export interface TripEvent {
  id: string;
  tripId: string;
  courierId: string | null;
  fromStatus: TripStatus | null;
  toStatus: TripStatus;
  createdAt: string;
  metadata: Record<string, unknown>;
}
