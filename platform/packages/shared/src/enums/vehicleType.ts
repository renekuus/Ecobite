/**
 * Courier vehicle types.
 * Affects routing constraints (pedestrian vs cycle vs motor) and payout rates.
 */
export enum VehicleType {
  BIKE        = 'bike',         // regular bicycle
  CARGO_BIKE  = 'cargo_bike',   // cargo bicycle (higher capacity, slower)
  SCOOTER     = 'scooter',      // electric scooter / moped
  WALK        = 'walk',         // on foot (short-range, dense urban only)
}
