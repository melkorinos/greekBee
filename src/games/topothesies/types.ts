// Topothesies data types — the contract between the build-time data pipeline
// (handoff-01) and the game logic (02) / UI (03).
//
// Two static files back the game, both emitted by scripts/ at build time:
//   • shapes.json  — one TopothesiesShape per entry (precomputed SVG geometry)
//   • answers.json — one TopothesiesAnswer per entry (names, capital, coords)
// They share the same `id` space; every answer has exactly one shape.

/** A `[lng, lat]` WGS84 coordinate pair. */
export type LngLat = [number, number];

/**
 * A silhouette to render. Geometry is a PRECOMPUTED SVG path string plus its
 * viewBox — never raw GeoJSON. The client never projects coordinates itself
 * (ADR: no client-side d3-geo), and only today's path is inlined into the page;
 * the full shapes.json set is a build-time asset that never ships wholesale.
 */
export interface TopothesiesShape {
  /** Stable entry id, shared with the matching TopothesiesAnswer. */
  id: string;
  /** Precomputed SVG `d` attribute (already projected + simplified). */
  path: string;
  /** SVG `viewBox` framing `path`, e.g. "0 0 100 120". */
  viewBox: string;
}

/**
 * Everything the game needs about one answer that is NOT geometry: the display
 * name, its capital (Stage 2), and the coordinates that drive the distance /
 * direction / proximity hints. `*Normalized` fields are accent-free (the
 * platform no-accent invariant) and power accent-insensitive autocomplete.
 */
export interface TopothesiesAnswer {
  /** Stable entry id, shared with the matching TopothesiesShape. */
  id: string;
  /** Display name, Greek (accents allowed here — this is shown, not matched). */
  name: string;
  /** Accent-free normalised name for autocomplete matching. */
  nameNormalized: string;
  /** Capital / chief town, Greek display form (Stage 2 answer). */
  capital: string;
  /** Accent-free normalised capital for matching. */
  capitalNormalized: string;
  /** Capital coordinate `[lng, lat]` — Stage 2 hint anchor. */
  capitalCoord: LngLat;
  /** Entry centroid `[lng, lat]` — Stage 1 distance/direction hint anchor. */
  centroid: LngLat;
  /** Alternate accepted names (accent-free), e.g. common alias spellings. */
  aliases: string[];
  /** Parent περιφέρεια (region) this entry belongs to. */
  region: string;
  /** True when this entry is an island (peeled or whole-island unit). */
  isIsland: boolean;
}

// ─── Gameplay types (handoff 02) ────────────────────────────────────────────
// The pure-logic layer. Everything below is React-free and touches answer
// METADATA only — never shapes.json geometry (that is display-only, handoff 03).

/**
 * One Worldle-style hint shown after a wrong guess: how far the guess was, an
 * 8-way arrow pointing from the guess toward the target, and a proximity % that
 * is scaled to the dataset's real max pairwise distance (not the globe).
 */
export interface GeoHint {
  /** Great-circle distance guess→target in kilometres. */
  distanceKm: number;
  /** One of ↑ ↗ → ↘ ↓ ↙ ← ↖ — points from the guess toward the target. */
  arrow: string;
  /** 0–100, scaled to PROXIMITY_MAX_KM (100 = same spot, 0 = at/over the max). */
  proximityPct: number;
}

/** A single Stage-1 (silhouette → regional unit) guess and its hint. */
export interface ShapeGuessRecord {
  /** Resolved answer id of the guess, or null if the text matched nothing. */
  guessId: string | null;
  /** True when the guess resolved to the target unit. */
  correct: boolean;
  /** Distance/arrow/proximity hint, or null for a correct guess. */
  hint: GeoHint | null;
}

/**
 * A single Stage-2 (bonus → capital) guess. Unlike the shape stage, the capital
 * stage carries NO distance hint — it is a plain right/wrong bonus round — so no
 * `hint` field here (product decision, 2026-07-21).
 */
export interface CapitalGuessRecord {
  /** Accent-normalised guessed capital. */
  guessNormalized: string;
  /** True when the guess matched the target's capital. */
  correct: boolean;
}

/** Which stage the round is in. "finished" = both stages resolved. */
export type TopothesiesStage = "shape" | "capital" | "finished";

/**
 * The full pure game state. `answers` is the candidate set used to resolve typed
 * guesses to ids/coords — metadata only, never geometry. Persistence (handoff
 * 03) saves the guess arrays + puzzleId and rebuilds this via the initial-state
 * factory, mirroring the other games' RESTORE_STATE pattern.
 */
export interface TopothesiesState {
  /** The target entry's id — the daily puzzle identity. */
  puzzleId: string;
  /** The answer the player is hunting. */
  target: TopothesiesAnswer;
  /** All candidate answers (for resolving typed guesses). Metadata only. */
  answers: TopothesiesAnswer[];
  /** Proximity scale — the dataset's max pairwise centroid distance (km). */
  maxKm: number;
  stage: TopothesiesStage;
  shapeGuesses: ShapeGuessRecord[];
  capitalGuesses: CapitalGuessRecord[];
  /** Stage 1 ended in a correct guess. */
  shapeSolved: boolean;
  /** Stage 1 ended by exhausting all guesses without solving. */
  shapeFailed: boolean;
  /** Stage 2 ended in a correct guess. */
  capitalSolved: boolean;
  /** Stage 2 ended by exhausting all guesses without solving. */
  capitalFailed: boolean;
  /** The player gave up: both stages are forced failed and the round finishes. */
  gaveUp: boolean;
}
