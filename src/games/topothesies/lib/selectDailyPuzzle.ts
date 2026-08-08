// selectDailyPuzzle.ts — deterministic daily puzzle pick (pure, no React).
// Reuses the platform's daily-rotation idiom (dateToIndex) so every player gets
// the same unit on a given date. The pick is UNIFORM over the answer set — no
// difficulty weighting; easy/hard days are intended variance (operator call).
//
// Sorted by id first so the pick is stable regardless of how the caller ordered
// the answers array (e.g. a re-emitted answers.json in a different order must
// not shift which unit is "today").

import { dateToIndex } from "@/lib/puzzleRotation";

import type { TopothesiesAnswer } from "../types";

/** The single Topothesies entry for `dateISO` (YYYY-MM-DD). */
export function selectDailyPuzzle(
  dateISO: string,
  answers: readonly TopothesiesAnswer[],
): TopothesiesAnswer {
  if (answers.length === 0) {
    throw new Error("selectDailyPuzzle: answer set is empty");
  }
  const sorted = [...answers].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[dateToIndex(dateISO, sorted.length)];
}
