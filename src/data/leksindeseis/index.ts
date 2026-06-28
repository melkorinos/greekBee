// Data loader for Leksindeseis puzzles.
// Primary source: community_leksindeseis_puzzles (approved FIFO).
// Fallback: puzzles-connections.json with deterministic date-based index.
// Returns null if no puzzle is available (both sources empty).

import { consumeApprovedPuzzle } from "@/lib/communityPuzzleLifecycle";
import { dateToIndex } from "@/lib/puzzleRotation";
import type { LeksindeseisPuzzle } from "@/games/leksindeseis/types";
import puzzles from "./puzzles-connections.json";

const ALL_PUZZLES = puzzles as LeksindeseisPuzzle[];

interface LeksindeseisDaily {
  puzzle: LeksindeseisPuzzle | null;
  submitter_name: string | null;
}

/**
 * Returns today's Leksindeseis puzzle for `date`.
 * Checks the community queue first; falls back to static pool.
 * Returns null puzzle if both sources are empty.
 */
export async function getTodaysLeksindeseisPuzzle(today: string): Promise<LeksindeseisDaily> {
  const consumed = await consumeApprovedPuzzle<LeksindeseisPuzzle["groups"]>("community_leksindeseis_puzzles");
  if (consumed) {
    const puzzle: LeksindeseisPuzzle = { date: today, groups: consumed.data };
    return { puzzle, submitter_name: consumed.submitter_name };
  }

  if (ALL_PUZZLES.length === 0) return { puzzle: null, submitter_name: null };

  const idx = dateToIndex(today, ALL_PUZZLES.length);
  return { puzzle: { ...ALL_PUZZLES[idx], date: today }, submitter_name: null };
}

export { ALL_PUZZLES as allLeksindeseisPuzzles };
