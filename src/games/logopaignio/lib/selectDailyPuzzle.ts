// selectDailyPuzzle.ts — pick today's puzzle (pure, no React).
//
// A puzzle's `date` is optional. When a row is pinned to `dateISO` (a hand-
// authored calendar day) it wins by exact match; otherwise we fall back to the
// platform's deterministic daily rotation (dateToIndex) over the pool sorted by
// `id` — the stable key that is always present (date isn't). So every player
// sees the same puzzle for a given day and the page always renders, including
// the single-row sample build.

import { dateToIndex } from "@/lib/puzzleRotation";

import type { LogopaignioPuzzle } from "../types";

/** The puzzle for `dateISO` (YYYY-MM-DD): exact-date match, else id-sorted rotation. */
export function selectDailyPuzzle(
  dateISO: string,
  puzzles: readonly LogopaignioPuzzle[],
): LogopaignioPuzzle {
  if (puzzles.length === 0) {
    throw new Error("selectDailyPuzzle: puzzle pool is empty");
  }
  const exact = puzzles.find((p) => p.date === dateISO);
  if (exact) return exact;

  const sorted = [...puzzles].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[dateToIndex(dateISO, sorted.length)];
}
