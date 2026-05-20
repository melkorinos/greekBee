// puzzle.ts — pure helpers that reason about Puzzle identity and metadata.
// No React, no side effects — fully unit-testable.

import type { Puzzle } from "../types";

/** Matches a YYYY-MM-DD date prefix (with optional suffix like "-el"). */
const DAILY_ID_RE = /^\d{4}-\d{2}-\d{2}/;

/** Matches a strict YYYY-MM-DD date string (no suffix). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns true when the puzzle is a daily curated puzzle.
 *
 * Daily puzzles have IDs that start with a YYYY-MM-DD date (e.g. "2026-05-20-el").
 * Custom puzzles have IDs like "custom-α-βγδεζη" — those return false.
 */
export function isDailyPuzzle(puzzle: Pick<Puzzle, "id">): boolean {
  return DAILY_ID_RE.test(puzzle.id);
}

/**
 * Returns true when the given string is a valid ISO date (YYYY-MM-DD).
 * Used by API route handlers to validate date parameters before querying the DB.
 */
export function isISODate(value: string): boolean {
  return ISO_DATE_RE.test(value);
}
