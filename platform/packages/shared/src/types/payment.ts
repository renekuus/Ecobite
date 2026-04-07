export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PayoutStatus  = 'pending' | 'processing' | 'paid' | 'failed';
export type PayoutRecipientType = 'courier' | 'merchant';

/** Customer payment for a single order (Stripe PaymentIntent). */
export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amountEur: number;
  currency: string;                     // 'EUR'
  stripePaymentIntentId: string;
  status: PaymentStatus;
  createdAt: string;
}

/** Periodic payout to a courier or merchant (Stripe Transfer). */
export interface Payout {
  id: string;
  recipientType: PayoutRecipientType;
  recipientId: string;
  periodFrom: string;                   // ISO 8601 date
  periodTo: string;
  amountEur: number;
  currency: string;
  stripeTransferId: string | null;      // null until transfer is initiated
  status: PayoutStatus;
  createdAt: string;
}

/** Push/SMS/email notification log entry. */
export interface Notification {
  id: string;
  recipientType: 'customer' | 'courier' | 'merchant_user';
  recipientId: string;
  channel: 'push' | 'sms' | 'email';
  template: string;
  payload: Record<string, unknown>;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

/** Platform key-value configuration entry. */
export interface Setting {
  id: string;
  key: string;
  value: unknown;                       // JSONB — any serialisable value
  description: string;
  updatedAt: string;
  updatedBy: string | null;
}
