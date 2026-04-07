import { MerchantGroup } from '../enums/merchantGroup';
import { SlaColor } from '../constants/sla';

/** One day's data point for the Mix & Migration chart. */
export interface MixDataPoint {
  date: string;                                 // ISO 8601 date
  dayOffset: number;                            // days since simulation epoch
  mix: Record<MerchantGroup, number>;           // fractions, sum = 1.0
  nOrders: number;
  segOrders: Record<MerchantGroup, number>;
  segRevenueEur: Record<MerchantGroup, number>;
  segProfitEur: Record<MerchantGroup, number>;
}

/** Segment financial summary for a given period. */
export interface SegmentSummary {
  group: MerchantGroup;
  orders: number;
  avgOrderValueEur: number;
  totalGmvEur: number;
  grossProfitEur: number;
  marginPct: number;
}

/** Aggregated financials for a time period (used in financials tab). */
export interface FinancialSummary {
  periodFrom: string;
  periodTo: string;
  totalOrders: number;
  totalGmvEur: number;
  totalCommissionEur: number;
  totalDeliveryFeesEur: number;
  totalCourierCostEur: number;
  grossProfitEur: number;
  segments: SegmentSummary[];
}

/** SLA health summary for a period. */
export interface SlaSummary {
  periodFrom: string;
  periodTo: string;
  totalOrders: number;
  green: number;
  yellow: number;
  red: number;
  /** Dominant SLA color (worst-case across all orders). */
  overall: SlaColor;
  avgDelayMin: number;
}
