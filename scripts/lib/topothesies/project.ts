// project.ts — build-time geometry projection for Topothesies (pure).
//
// ADR 0018: the client never projects — every silhouette ships as a precomputed
// SVG `d` path + a self-framing `viewBox`. This module turns [lng,lat] rings
// into that geometry. The projection is a simple equirectangular one: longitude
// is scaled by cos(refLat) so a Greek regional unit is not stretched east-west,
// and latitude is negated because SVG's y-axis points down while north is up.
//
// Distances (for the proximity scale) reuse the game's haversineKm — never a
// re-rolled great-circle formula (handoff-03 seam note).

import { haversineKm } from "../../../src/games/topothesies/lib/geo";
import type { LngLat } from "../../../src/games/topothesies/types";

/** Project one [lng,lat] to SVG space at a reference latitude. */
export function projectPoint([lng, lat]: LngLat, refLat: number): [number, number] {
  const k = Math.cos((refLat * Math.PI) / 180);
  return [lng * k, -lat];
}

const round = (n: number, precision: number): number => {
  const f = 10 ** precision;
  // +0 collapses a rounded -0 back to 0 so paths never carry "-0".
  return Math.round(n * f) / f + 0;
};

/**
 * An `M…L…Z` sub-path for one ring, projected at `refLat` and rounded to
 * `precision` decimals. Coordinates are space-separated; consecutive commands
 * abut (SVG allows `M0 0L2 0`), keeping the string compact.
 */
export function ringToPath(ring: LngLat[], refLat: number, precision = 3): string {
  const cmds = ring.map(([lng, lat], i) => {
    const [x, y] = projectPoint([lng, lat], refLat);
    return `${i === 0 ? "M" : "L"}${round(x, precision)} ${round(y, precision)}`;
  });
  return `${cmds.join("")}Z`;
}

/** Bounding box of already-projected points as an SVG `viewBox` string. */
export function computeViewBox(points: [number, number][], pad = 0): string {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;
  const px = w * pad;
  const py = h * pad;
  const r = (n: number) => Math.round(n * 1000) / 1000 + 0;
  return `${r(minX - px)} ${r(minY - py)} ${r(w + 2 * px)} ${r(h + 2 * py)}`;
}

/** Signed shoelace area of a ring in [lng,lat] units (CCW positive). */
export function ringArea(ring: LngLat[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

/**
 * Area-weighted centroid (in [lng,lat]) across one or more polygons. Each
 * argument is a polygon (an array of rings; the first is the outer ring, which
 * is the only one used here — holes are ignored). Passing several polygons (a
 * MultiPolygon) weights each by its outer-ring area, so a large landmass
 * dominates a tiny detached islet. Falls back to the vertex mean when every
 * ring is degenerate (zero area).
 */
export function centroidLngLat(...polygons: LngLat[][][]): LngLat {
  let cxA = 0;
  let cyA = 0;
  let totalA = 0;
  for (const polygon of polygons) {
    const ring = polygon[0];
    const a = ringArea(ring);
    if (a === 0) continue;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      const cross = x1 * y2 - x2 * y1;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
    cx /= 6 * a;
    cy /= 6 * a;
    const w = Math.abs(a);
    cxA += cx * w;
    cyA += cy * w;
    totalA += w;
  }
  if (totalA === 0) {
    // Degenerate: mean of all outer-ring vertices.
    const all = polygons.flatMap((p) => p[0]);
    const x = all.reduce((s, p) => s + p[0], 0) / all.length;
    const y = all.reduce((s, p) => s + p[1], 0) / all.length;
    return [x, y];
  }
  return [cxA / totalA, cyA / totalA];
}

/** Largest great-circle distance (km) over every pair of centroids. */
export function maxPairwiseCentroidKm(centroids: LngLat[]): number {
  let max = 0;
  for (let i = 0; i < centroids.length; i++) {
    for (let j = i + 1; j < centroids.length; j++) {
      const d = haversineKm(centroids[i], centroids[j]);
      if (d > max) max = d;
    }
  }
  return max;
}
