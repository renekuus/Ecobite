/**
 * Top-level segment classification for merchants.
 * Drives commission rates, delivery fee structures, and mix analytics.
 * Mirrors the simulation's group field exactly.
 */
export enum MerchantGroup {
  QSR         = 'qsr',          // Quick Service Restaurants (McDonald's, Hesburger…)
  RESTAURANT  = 'restaurant',   // Sit-down / full-service restaurants
  DARKSTORE   = 'darkstore',    // EcoBite-operated dark stores (grocery/convenience)
  OTHER       = 'other',        // Cafes, grocery retailers, other
}
