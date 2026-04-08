// ─── Analytics ────────────────────────────────────────────────────────────────

export interface SummaryResponse {
  period:               { from: string; to: string };
  totalOrders:          number;
  deliveredOrders:      number;
  cancelledOrders:      number;
  totalGmvEur:          number;
  previousPeriodGmvEur: number;   // GMV for the same-length period immediately before
  totalCommissionEur:         number;
  totalContributionProfitEur: number;   // commission + fees − allocated courier cost
  avgOrderValueEur:           number;
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
  segProfit:   SegMap;   // contribution profit (commission + fees − allocated courier cost)
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

export interface OrderMerchant {
  id:    string;
  name:  string;
  group: string;
}

export interface OrderCustomer {
  id:    string;
  name:  string;
  email: string;
  phone: string;
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
  // Embedded via JOIN
  merchant:  OrderMerchant | null;
  customer:  OrderCustomer | null;
  // Trip economics — computed in API; 0/null when order has no trip yet
  trip_order_count:           number | null;
  allocated_courier_cost_eur: number;
  contribution_profit_eur:    number;
}

export interface OrdersResponse {
  orders: OrderRow[];
  total:  number;
  limit:  number;
  offset: number;
}

// ─── Live ─────────────────────────────────────────────────────────────────────

export interface TripStop {
  seq:           number;
  type:          'pickup' | 'dropoff';
  merchant_name: string | null;
  customer_name: string | null;
  order_id:      string | null;
  completed_at:  string | null;
}

export interface LiveOrder {
  id:                        string;
  order_number:              string;
  status:                    string;
  urgency:                   string;
  merchant_id:               string;
  merchant_name:             string | null;
  merchant_group:            string;
  customer_id:               string;
  customer_name:             string | null;
  courier_id:                string | null;
  courier_name:              string | null;
  trip_id:                   string | null;
  delivery_address_snapshot: DeliverySnapshot;
  subtotal_eur:              string;
  estimated_delivery_at:     string | null;
  created_at:                string;
  delay_min:                 number | null;
}

export interface LiveCourier {
  id:              string;
  name:            string;
  status:          string;
  vehicle_type:    string;
  active_trips:    number;
  assigned_orders: number;
}

export interface LiveTrip {
  id:           string;
  courier_id:   string;
  courier_name: string | null;
  status:       string;
  order_count:  number;
  stop_count:   number;
  is_batched:   boolean;
  created_at:   string;
  started_at:   string | null;
  stops:        TripStop[];
}

export interface LiveInsight {
  type:    'batching' | 'delay' | 'efficiency' | 'load';
  icon:    string;
  message: string;
}

export interface LiveSummary {
  totalActive:   number;
  totalCouriers: number;
  onShift:       number;
  activeTrips:   number;
  delayedOrders: number;
  batchedTrips:  number;
}

export interface LiveResponse {
  activeOrders: LiveOrder[];
  couriers:     LiveCourier[];
  activeTrips:  LiveTrip[];
  insights:     LiveInsight[];
  updatedAt:    string;
  summary:      LiveSummary;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  ts:     string;
  redis:  string;
}
