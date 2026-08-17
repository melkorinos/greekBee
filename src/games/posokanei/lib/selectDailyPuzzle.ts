// selectDailyPuzzle.ts — pick today's puzzle (pure, no React).
//
// Every puzzle carries an explicit `date`, so this is a hand-authored daily
// calendar and the rule is the platform's shared one: exact date match, else a
// deterministic rotation over the rows already due. `pickByDateOrRotate` owns
// the whole rule — including why the miss must never be "the last row" — and
// Leksokipos serves its calendar through the same function.

import { pickByDateOrRotate } from "@/lib/puzzleRotation";

import type { PosokaneiPuzzle } from "../types";

/** The puzzle for `dateISO` (YYYY-MM-DD): exact-date match, else rotation. */
export function selectDailyPuzzle(
  dateISO: string,
  puzzles: readonly PosokaneiPuzzle[],
): PosokaneiPuzzle {
  if (puzzles.length === 0) {
    throw new Error("selectDailyPuzzle: puzzle pool is empty");
  }
  return pickByDateOrRotate(dateISO, puzzles);
}
