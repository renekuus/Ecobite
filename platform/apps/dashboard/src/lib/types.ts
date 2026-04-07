// ─── Analytics ────────────────────────────────────────────────────────────────

export interface SummaryResponse {
  period:              { from: string; to: string };
  totalOrders:         number;
  deliveredOrders:     number;
  cancelledOrders:     number;
  totalGmvEur:         number;
  totalCommissionEur:  number;
  totalGrossProfitEur: number;
  avgOrderValueEur:    number;
}

export type SegMap = {
  qsr:        number;
  restaurant: number;
  darkstore:  number;
  other:      number;
};

export interface MixDayPoint {
  date:        string;   // YYYY-MM-DD (bucket start)
  totalOrders: number;
  mix:         SegMap;   // fractions 0–1
  segOrders:   SegMap;
  segRevenue:  SegMap;
  segProfit:   SegMap;
}

export interface MixResponse {
  from:         string;
  to:           string;
  granularity:  'daily' | 'weekly' | 'monthly';
  totalOrders:  number;
  days:         MixDayPoint[];
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface DeliverySnapshot {
  street:     string;
  city:       string;
  postalCode: string;
  lat:        number;
  lng:        number;
}

export interface OrderRow {
  id:                        string;
  order_number:              string;
  customer_id:               string;
  merchant_id:               string;
  merchant_group:            'qsr' | 'restaurant' | 'darkstore' | 'other';
  courier_id:                string | null;
  trip_id:                   string | null;
  status:                    string;
  delivery_address_snapshot: DeliverySnapshot;
  subtotal_eur:              string;
  delivery_fee_eur:          string;
  service_fee_eur:           string;
  tip_eur:                   string;
  commission_eur:            string;
  gross_profit_eur:          string;
  urgency:                   'green' | 'yellow' | 'red';
  notes:                     string | null;
  cancellation_reason:       string | null;
  estimated_delivery_at:     string | null;
  actual_delivered_at:       string | null;
  created_at:                string;
  updated_at:                string;
}

export interface OrdersResponse {
  orders: OrderRow[];
  total:  number;
  limit:  number;
  offset: number;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  ts:     string;
  redis:  string;
}
