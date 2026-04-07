/**
 * Trip / batching constants — mirrored from simulation exactly.
 */

/**
 * Total payout to courier per completed trip, regardless of how many orders it contains.
 * Courier cost per order = COURIER_TRIP_COST_EUR / orders_in_trip.
 * Source: simulation COURIER_TRIP_COST = 20.00
 * @provisional — real payout structure may be distance-based or hybrid.
 */
export const COURIER_TRIP_COST_EUR = 20.00;

/**
 * Historical average orders per trip (used in financial modelling and analytics).
 * Source: simulation AVG_TRIP_SIZE = 2.27
 * @provisional — recalculate from real trip data once available.
 */
export const AVG_TRIP_SIZE = 2.27;

/**
 * Batching window for QSR orders — how long to hold before dispatching a trip.
 * Simulation: 60 000 ms (labeled "20 min ETA buffer").
 * @provisional — these are demo-compressed timings. Real values are 15–20 min.
 */
export const BATCH_WINDOW_QSR_MS = 60_000;

/**
 * Batching window for non-QSR orders.
 * Simulation: 90 000 ms (labeled "30 min ETA buffer").
 * @provisional
 */
export const BATCH_WINDOW_OTHER_MS = 90_000;

/**
 * Maximum orders allowed in a single batched trip.
 * @provisional — not hardcoded in simulation; derived from operational target.
 */
export const MAX_ORDERS_PER_TRIP = 4;
