// selectDailyPuzzle.ts — pick today's puzzle (pure, no React).
//
// Puzzles carry an explicit `date`, so the primary rule is an exact date match
// (a hand-authored daily calendar). When no row is dated for `dateISO` — e.g. a
// gap in the calendar, or the single-row sample build — we fall back to the
// platform's deterministic daily rotation (dateToIndex) over the pool sorted by
// date, so every player still sees the same puzzle and the page always renders.
//
// The fallback rotates only over rows already DUE (date <= dateISO). Rotating
// over the whole pool would serve a row pinned to a future calendar day on an
// earlier gap day — spoiling it, then repeating it when its own day arrives.
// If nothing is due yet (an all-future calendar, or the sample build) we rotate
// the whole pool rather than fail: rendering beats hiding.

import { dateToIndex } from "@/lib/puzzleRotation";

import type { PosokaneiPuzzle } from "../types";

/** The puzzle for `dateISO` (YYYY-MM-DD): exact-date match, else rotation. */
export function selectDailyPuzzle(
  dateISO: string,
  puzzles: readonly PosokaneiPuzzle[],
): PosokaneiPuzzle {
  if (puzzles.length === 0) {
    throw new Error("selectDailyPuzzle: puzzle pool is empty");
  }
  const exact = puzzles.find((p) => p.date === dateISO);
  if (exact) return exact;

  const due = puzzles.filter((p) => p.date <= dateISO);
  const pool = due.length > 0 ? due : puzzles;

  const sorted = [...pool].sort((a, b) => a.date.localeCompare(b.date));
  return sorted[dateToIndex(dateISO, sorted.length)];
}
