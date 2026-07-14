// Leksoplegma — pure scoring (no side effects, no React).
// No timer anywhere: points only. Required words score by length, hints cost
// flat, and the total never drops below the floor.
// There is no MAX_SCORE cap — the base varies per puzzle (word lengths differ)
// and the leaderboard is per-puzzle daily, so that stays fair.

import { LEKSOPLEGMA } from "@/config/gameRules";

/**
 * Total round score:
 *   Σ(required length × POINTS_PER_LETTER) − hints × HINT_COST_POINTS,
 *   floored at SCORE_FLOOR.
 */
export function computeScore(
  foundRequired: readonly string[],
  hintsUsed: readonly string[],
): number {
  const required = foundRequired.reduce(
    (sum, word) => sum + word.length * LEKSOPLEGMA.POINTS_PER_LETTER,
    0,
  );
  const total = required - hintsUsed.length * LEKSOPLEGMA.HINT_COST_POINTS;
  return Math.max(LEKSOPLEGMA.SCORE_FLOOR, total);
}

/** is_perfect: the round used zero hints (all required words are found at completion). */
export function isPerfectRound(hintsUsed: readonly string[]): boolean {
  return hintsUsed.length === 0;
}
