import { OrderStatus } from '../enums/orderStatus';
import { MerchantGroup } from '../enums/merchantGroup';
import { SlaStageKey } from '../constants/sla';

/** Delivery address frozen at the moment the order was placed. */
export interface DeliveryAddressSnapshot {
  street: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
}

/** SLA stage snapshot — stored per order, updated as stages progress. */
export interface SlaStage {
  key: SlaStageKey;
  label: string;
  promisedMin: number;
  googleMapsMin: number;
  actualMin: number | null;
  startAt: string | null;       // ISO 8601
  completedAt: string | null;
  status: 'pending' | 'active' | 'completed';
}

export interface OrderSla {
  promisedEtaMin: number;
  googleMapsEtaMin: number;
  stages: SlaStage[];
}

export interface Order {
  id: string;                         // UUID
  orderNumber: string;                // human-readable e.g. EB-20260406-0042
  customerId: string;
  merchantId: string;
  merchantGroup: MerchantGroup;
  courierId: string | null;
  tripId: string | null;
  status: OrderStatus;
  deliveryAddressSnapshot: DeliveryAddressSnapshot;
  subtotalEur: number;
  deliveryFeeEur: number;
  serviceFeeEur: number;
  tipEur: number;
  commissionEur: number;
  grossProfitEur: number;
  sla: OrderSla;
  urgency: 'green' | 'yellow' | 'red';
  notes: string | null;
  cancellationReason: string | null;
  estimatedDeliveryAt: string | null;
  actualDeliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Product snapshot frozen at order time — product prices/names may change later. */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;           // null if product was deleted after order
  productNameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  modifierSnapshot: Array<{ name: string; priceDeltaEur: number }>;
  lineTotalEur: number;
}

/** Full audit trail entry for a status transition on an order. */
export interface OrderEvent {
  id: string;
  orderId: string;
  actorType: 'customer' | 'courier' | 'merchant' | 'system';
  actorId: string | null;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  createdAt: string;
  metadata: Record<string, unknown>;
}
