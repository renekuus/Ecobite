/**
 * Operational status of a courier account/profile.
 * Separate from whether they are currently on a shift — see CourierShift.
 */
export enum CourierStatus {
  ACTIVE      = 'ACTIVE',       // account in good standing; eligible for shifts
  ON_SHIFT    = 'ON_SHIFT',     // currently clocked in and accepting trips
  INACTIVE    = 'INACTIVE',     // not available (off-boarded, taking a break period)
  SUSPENDED   = 'SUSPENDED',    // suspended pending review
}
