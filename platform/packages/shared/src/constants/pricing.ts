import { MerchantGroup } from '../enums/merchantGroup';

/**
 * Pricing constants — mirrored from simulation financial helpers.
 * Values marked @provisional are from the simulation model and should be
 * confirmed against real contract terms before going live.
 */

// ─────────────────────────────────────────────────────────────────────────────
// COMMISSION RATES  (fraction of order subtotal retained by EcoBite)
// Source: individual STORES entries in simulation + SEG_COMM in _getMixEvolution
// @provisional — final rates depend on merchant contracts
// ─────────────────────────────────────────────────────────────────────────────
export const COMMISSION_RATE: Record<MerchantGroup, number> = {
  [MerchantGroup.DARKSTORE]:  0.30,   // 30% — EcoBite-operated; highest margin
  [MerchantGroup.RESTAURANT]: 0.19,   // 19% — segment average (range: 17%–23%)
  [MerchantGroup.QSR]:        0.10,   // 10% — QSR chains; negotiated lower rate
  [MerchantGroup.OTHER]:      0.115,  // 11.5% — segment average (range: 8%–12%)
};

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY FEE STRUCTURE  (revenue earned by EcoBite per order, not courier payout)
// Logic: fee = val < freeDeliveryThreshold ? feeUnder : feeOver
// ─────────────────────────────────────────────────────────────────────────────

/** Default delivery fee for orders below the free-delivery threshold. */
export const DEFAULT_DELIVERY_FEE_EUR = 4.90;

/** Per-segment fee structure used in analytics / mix simulation. @provisional */
export const DELIVERY_FEE_PER_ORDER: Record<MerchantGroup, number> = {
  [MerchantGroup.DARKSTORE]:  0.22,   // small darkstore delivery fee
  [MerchantGroup.QSR]:        1.32,   // QSR typically has higher delivery fee revenue
  [MerchantGroup.RESTAURANT]: 0.00,   // restaurants often waive delivery fee @provisional
  [MerchantGroup.OTHER]:      0.83,
};

/** Free-delivery order value threshold by segment (EUR). */
export const FREE_DELIVERY_THRESHOLD_EUR: Record<MerchantGroup, number> = {
  [MerchantGroup.DARKSTORE]:  20,
  [MerchantGroup.QSR]:        25,
  [MerchantGroup.RESTAURANT]: 25,
  [MerchantGroup.OTHER]:      30,
};

// ─────────────────────────────────────────────────────────────────────────────
// AVERAGE ORDER VALUES  (used in analytics/simulation; not enforced at runtime)
// Source: SEG_AVG in _getMixEvolution. @provisional
// ─────────────────────────────────────────────────────────────────────────────
export const AVG_ORDER_VALUE_EUR: Record<MerchantGroup, number> = {
  [MerchantGroup.DARKSTORE]:  47.50,
  [MerchantGroup.QSR]:        34.00,
  [MerchantGroup.RESTAURANT]: 50.00,
  [MerchantGroup.OTHER]:      50.00,
};
