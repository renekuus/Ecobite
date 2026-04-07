/**
 * Lifecycle states for a customer order.
 * State machine:
 *   PLACED → CONFIRMED → PREPARING → READY → ASSIGNED → PICKED_UP → DELIVERING → DELIVERED
 *   Any active state → CANCELLED | FAILED
 */
export enum OrderStatus {
  PLACED      = 'PLACED',       // customer submitted; not yet seen by merchant
  CONFIRMED   = 'CONFIRMED',    // merchant acknowledged
  PREPARING   = 'PREPARING',    // kitchen/darkstore assembling the order
  READY       = 'READY',        // packed; waiting for courier pickup
  ASSIGNED    = 'ASSIGNED',     // courier assigned to a trip containing this order
  PICKED_UP   = 'PICKED_UP',    // courier confirmed pickup at merchant
  DELIVERING  = 'DELIVERING',   // courier en route to customer
  DELIVERED   = 'DELIVERED',    // confirmed delivery
  CANCELLED   = 'CANCELLED',    // cancelled by customer, merchant, or ops
  FAILED      = 'FAILED',       // undeliverable — returned or abandoned
}
