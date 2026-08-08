// puzzle.ts — pure helpers that reason about Puzzle identity and metadata.
// No React, no side effects — fully unit-testable.

import type { LeksokiposPuzzle } from "../types";

/** Matches a YYYY-MM-DD date prefix (with optional suffix like "-el"). */
const DAILY_ID_RE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Returns true when the puzzle is a daily pre-built puzzle.
 *
 * Daily puzzles have IDs that start with a YYYY-MM-DD date (e.g. "2026-05-20-el").
 * Custom puzzles have IDs like "custom-α-βγδεζη" — those return false.
 */
export function isDailyPuzzle(puzzle: Pick<LeksokiposPuzzle, "id">): boolean {
  return DAILY_ID_RE.test(puzzle.id);
}
