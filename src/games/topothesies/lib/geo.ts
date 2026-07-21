// geo.ts — Worldle-style hint math for Topothesies (pure, no React).
// Operates on real [lng, lat] centroids/capital coords — NEVER on shapes.json
// geometry (that is display-only). Distances feed the daily distance hint, the
// bearing feeds the 8-way arrow, and proximity% is scaled to the DATASET's max
// pairwise distance (small-country tuning), not the globe.

import type { LngLat } from "../types";

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres between two [lng, lat] points. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Compass glyphs, indexed clockwise from north in 45° steps.
const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"] as const;

/**
 * An 8-way arrow pointing from `from` toward `to` (initial great-circle
 * bearing, bucketed to the nearest 45°). ↑ = north, → = east, etc.
 */
export function bearingToArrow(from: LngLat, to: LngLat): string {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI; // −180..180, 0 = north
  const normalized = (bearing + 360) % 360;            // 0..360
  const index = Math.round(normalized / 45) % 8;       // nearest 45° bucket
  return ARROWS[index];
}

/**
 * Proximity as 0–100, scaled to `maxKm` (the dataset's max pairwise distance):
 * 100 = same spot, 0 = at or beyond the max. Guards an unset/invalid scale
 * (`maxKm <= 0`, e.g. the placeholder PROXIMITY_MAX_KM before emission) by
 * returning 0 — never divides by zero.
 */
export function proximityPct(distanceKm: number, maxKm: number): number {
  if (maxKm <= 0) return 0;
  const pct = (1 - distanceKm / maxKm) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
