/**
 * SLA thresholds — mirrors simulation calcUrgency() and stageDotCls() logic exactly.
 *
 * Each active SLA stage (courier→store, store prep, store→customer) is evaluated
 * independently. The order's overall urgency is the worst stage.
 *
 * Delay is: (elapsed or actual minutes) − promised minutes for that stage.
 * GREEN  = delay ≤ SLA_YELLOW_THRESHOLD_MIN   (no warning)
 * YELLOW = delay > SLA_YELLOW_THRESHOLD_MIN    (approaching breach)
 * RED    = delay > SLA_RED_THRESHOLD_MIN       (SLA breached)
 */

/** Minutes of stage delay before status turns YELLOW. */
export const SLA_YELLOW_THRESHOLD_MIN = 3;

/** Minutes of stage delay before status turns RED (SLA breach). */
export const SLA_RED_THRESHOLD_MIN = 10;

export type SlaColor = 'green' | 'yellow' | 'red';

/**
 * Evaluate SLA color for a single stage given delay in minutes.
 * Pure function — safe to use in both API and frontend.
 */
export function slaColor(delayMin: number): SlaColor {
  if (delayMin > SLA_RED_THRESHOLD_MIN) return 'red';
  if (delayMin > SLA_YELLOW_THRESHOLD_MIN) return 'yellow';
  return 'green';
}

/**
 * Promised ETA options offered to customers at order creation (minutes).
 * PROVISIONAL — simulation values [20, 50, 70]. Real values depend on
 * live routing + prep time estimates once the API is wired.
 * @provisional
 */
export const PROMISED_ETA_OPTIONS_MIN: readonly number[] = [20, 50, 70] as const;

/**
 * Three SLA stages every order passes through.
 * Keys match the simulation's stage.key field.
 */
export const SLA_STAGE_KEYS = ['to_merchant', 'merchant_prep', 'to_customer'] as const;
export type SlaStageKey = typeof SLA_STAGE_KEYS[number];
