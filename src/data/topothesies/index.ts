// Topothesies static data accessors.
//
// answers.json — metadata for every entry (names/capitals/coords, no geometry).
// It is small (~28 KB) and DOES ship to the client: autocomplete needs the
// names and the hints need every entry's centroid/capitalCoord.
//
// shapes.json — one precomputed SVG path + viewBox per entry (~96 KB). This is
// SERVER-ONLY: the route inlines just today's one path (ADR 0018 — bundle and
// Fluid CPU stay flat regardless of how many shapes exist). Import it only from
// server components.

import type { TopothesiesAnswer, TopothesiesShape } from "@/games/topothesies/types";

import answersJson from "./answers.json";
import shapesJson from "./shapes.json";

/** Every answer's metadata (no geometry). Safe to send to the client. */
export const TOPOTHESIES_ANSWERS = answersJson as TopothesiesAnswer[];

const SHAPES_BY_ID = new Map<string, TopothesiesShape>(
  (shapesJson as TopothesiesShape[]).map((s) => [s.id, s]),
);

/** The precomputed silhouette for one entry (server-only — pulls from shapes.json). */
export function getTopothesiesShape(id: string): TopothesiesShape {
  const shape = SHAPES_BY_ID.get(id);
  if (!shape) throw new Error(`getTopothesiesShape: no shape for id "${id}"`);
  return shape;
}
