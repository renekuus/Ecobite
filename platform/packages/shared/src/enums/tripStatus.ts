/**
 * Lifecycle states for a courier trip (one or more batched orders).
 * PENDING → ACTIVE → COMPLETED
 * PENDING | ACTIVE → CANCELLED
 */
export enum TripStatus {
  PENDING    = 'PENDING',    // trip created; courier not yet started
  ACTIVE     = 'ACTIVE',     // courier has started; stops in progress
  COMPLETED  = 'COMPLETED',  // all stops confirmed
  CANCELLED  = 'CANCELLED',  // trip abandoned before completion
}
