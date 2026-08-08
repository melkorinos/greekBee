// validateEmitted — the gate the two static Topothesies data files must pass
// before they are committed. Pure: data in, a list of human-readable error
// strings out (empty = valid). Guards the invariants in handoff-01's Gates.

import type { TopothesiesAnswer, TopothesiesShape } from "../../../src/games/topothesies/types";

export interface EmittedData {
  answers: TopothesiesAnswer[];
  shapes: TopothesiesShape[];
}

export interface Bbox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface ValidateConfig {
  /** Ids that MUST be present (the confirmed-split islands + any locked units). */
  requiredIds: string[];
  /** Coordinate window; defaults to GREECE_BBOX. */
  bbox?: Bbox;
}

// Padded bounding box of Greece (WGS84). West: Othonoi ~19.3E; East: Kastelorizo
// ~29.6E; South: Gavdos ~34.8N; North: ~41.75N. Padded to tolerate simplified
// centroids without admitting a clearly-foreign coordinate.
export const GREECE_BBOX: Bbox = { minLng: 18.9, maxLng: 30.0, minLat: 34.6, maxLat: 41.9 };

/** True if the string carries any Unicode combining diacritic (an accent). */
function hasAccent(s: string): boolean {
  return s
    .normalize("NFD")
    .split("")
    .some((ch) => {
      const cp = ch.codePointAt(0)!;
      return cp >= 0x0300 && cp <= 0x036f;
    });
}

function inBbox([lng, lat]: [number, number], b: Bbox): boolean {
  return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
}

export function validateEmitted(
  { answers, shapes }: EmittedData,
  { requiredIds, bbox = GREECE_BBOX }: ValidateConfig,
): string[] {
  const errors: string[] = [];

  const answerIds = new Set<string>();
  for (const a of answers) {
    if (answerIds.has(a.id)) errors.push(`duplicate answer id "${a.id}"`);
    answerIds.add(a.id);
  }

  const shapeIds = new Set<string>();
  for (const s of shapes) {
    if (shapeIds.has(s.id)) errors.push(`duplicate shape id "${s.id}"`);
    shapeIds.add(s.id);
  }

  // ── id parity, both directions ──────────────────────────────────────────────
  for (const a of answers) {
    if (!shapeIds.has(a.id)) errors.push(`answer "${a.id}" has no matching shape`);
  }
  for (const s of shapes) {
    if (!answerIds.has(s.id)) errors.push(`orphan shape "${s.id}" has no matching answer`);
  }

  // ── every required (confirmed-split) id present ─────────────────────────────
  for (const id of requiredIds) {
    if (!answerIds.has(id)) errors.push(`confirmed-split entry "${id}" is missing from answers`);
  }

  // ── coordinates inside Greece, and normalized fields accent-free ────────────
  for (const a of answers) {
    if (!inBbox(a.centroid, bbox)) {
      errors.push(`answer "${a.id}" centroid ${JSON.stringify(a.centroid)} is outside Greece`);
    }
    if (!inBbox(a.capitalCoord, bbox)) {
      errors.push(`answer "${a.id}" capitalCoord ${JSON.stringify(a.capitalCoord)} is outside Greece`);
    }
    if (hasAccent(a.nameNormalized)) {
      errors.push(`answer "${a.id}" nameNormalized "${a.nameNormalized}" contains an accent`);
    }
    if (hasAccent(a.capitalNormalized)) {
      errors.push(`answer "${a.id}" capitalNormalized "${a.capitalNormalized}" contains an accent`);
    }
    for (const alias of a.aliases) {
      if (hasAccent(alias)) errors.push(`answer "${a.id}" alias "${alias}" contains an accent`);
    }
  }

  return errors;
}
