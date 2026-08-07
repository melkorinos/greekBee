// selectDailyPuzzle.ts — pick today's puzzle (pure, no React).
//
// A puzzle's `date` is optional. When a row is pinned to `dateISO` (a hand-
// authored calendar day) it wins by exact match; otherwise we fall back to the
// platform's deterministic daily rotation (dateToIndex) over the pool sorted by
// `id` — the stable key that is always present (date isn't). So every player
// sees the same puzzle for a given day and the page always renders, including
// the single-row sample build.
//
// The rotation pool excludes rows pinned to a FUTURE date: an undated row is
// always eligible, a dated one only from its own day onward. Otherwise a row
// pinned to next month would surface early on a rotation day and then repeat
// on its pinned day. If every row is future-pinned we rotate the whole pool
// rather than fail: rendering beats hiding.

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

  const eligible = puzzles.filter((p) => !p.date || p.date <= dateISO);
  const pool = eligible.length > 0 ? eligible : puzzles;

  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[dateToIndex(dateISO, sorted.length)];
}
