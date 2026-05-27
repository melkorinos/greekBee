// Rank calculation — maps a player's current score to a rank name.
// Ranks are thresholds expressed as a percentage of the max possible score.

import type { Rank, RankName } from "../types";

/**
 * Ordered rank ladder from lowest to highest threshold.
 * A player achieves a rank when their score % >= that rank's threshold.
 */
export const RANKS: Rank[] = [
  { name: "Σπόρος",     threshold: 0  },
  { name: "Βλαστός",    threshold: 6  },
  { name: "Μπουμπούκι", threshold: 12 },
  { name: "Άνοιγμα",   threshold: 20 },
  { name: "Ανθισμένο",  threshold: 30 },
  { name: "Θαυμαστό",   threshold: 42 },
  { name: "Ευφυΐα",     threshold: 55 },
  { name: "Άνθος",      threshold: 80 },
];

/**
 * Returns the player's current rank given their score and the puzzle's max score.
 * Walks the ladder from the top down and returns the first rank the player qualifies for.
 */
export function calculateRank(score: number, puzzleMaxScore: number): RankName {
  // Avoid division by zero on an empty puzzle
  if (puzzleMaxScore === 0) return "Σπόρος";

  const pct = (score / puzzleMaxScore) * 100;

  // Iterate from highest to lowest to find the best rank achieved
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (pct >= RANKS[i].threshold) {
      return RANKS[i].name;
    }
  }

  return "Σπόρος";
}

