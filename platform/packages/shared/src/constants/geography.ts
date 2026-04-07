/**
 * Geographic constants for the Helsinki operating area.
 * Coordinates sourced directly from simulation merchant store positions.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Default map centre — central Helsinki. Used as fallback when no location available. */
export const HELSINKI_CENTRE: LatLng = { lat: 60.1699, lng: 24.9384 };

/**
 * Approximate bounding box for the current delivery operating area.
 * Derived from the outermost simulation merchant positions.
 * Expand as coverage grows.
 */
export const HELSINKI_BOUNDS = {
  north: 60.215,
  south: 60.145,
  east:  25.090,
  west:  24.905,
} as const;

/** Default map zoom level for the operations dashboard. */
export const DEFAULT_MAP_ZOOM = 13;

/** IANA timezone for Helsinki — used for date formatting and shift scheduling. */
export const TIMEZONE = 'Europe/Helsinki';

/** ISO 3166-1 alpha-2 country code. */
export const COUNTRY_CODE = 'FI';

/** Currency used throughout the platform. */
export const CURRENCY = 'EUR';

/** Locale string for number/date formatting (Finnish). */
export const LOCALE = 'fi-FI';
