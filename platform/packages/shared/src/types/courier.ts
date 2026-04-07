import { CourierStatus } from '../enums/courierStatus';
import { VehicleType } from '../enums/vehicleType';

export interface Courier {
  id: string;
  email: string;
  phone: string;
  name: string;
  status: CourierStatus;
  vehicleType: VehicleType;
  rating: number | null;          // 1.0–5.0; null until first rated delivery
  stripeAccountId: string | null; // for payouts
  deviceToken: string | null;     // FCM/APNs push token (latest known)
  createdAt: string;
}

/** Live courier position — stored in Redis, not PostgreSQL. */
export interface CourierLocation {
  courierId: string;
  lat: number;
  lng: number;
  heading: number | null;         // degrees 0–360
  updatedAt: string;              // ISO 8601
}

export interface CourierShift {
  id: string;
  courierId: string;
  startedAt: string;
  endedAt: string | null;         // null = shift still active
  status: 'active' | 'completed' | 'abandoned';
}
