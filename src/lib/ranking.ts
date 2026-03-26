// Rank calculation — maps a player's current score to a rank name.
// Ranks are thresholds expressed as a percentage of the max possible score.

import type { Rank, RankName } from "@/types";

/**
 * Ordered rank ladder from lowest to highest threshold.
 * A player achieves a rank when their score % >= that rank's threshold.
 */
export const RANKS: Rank[] = [
  { name: "Beginner",  threshold: 0  },
  { name: "Moving Up", threshold: 4  },
  { name: "Good",      threshold: 6  },
  { name: "Solid",     threshold: 12 },
  { name: "Great",     threshold: 32 },
  { name: "Amazing",   threshold: 40 },
  { name: "Genius",    threshold: 56 },
  { name: "Queen Bee", threshold: 80 },
];

/**
 * Returns the player's current rank given their score and the puzzle's max score.
 * Walks the ladder from the top down and returns the first rank the player qualifies for.
 */
export function calculateRank(score: number, puzzleMaxScore: number): RankName {
  // Avoid division by zero on an empty puzzle
  if (puzzleMaxScore === 0) return "Beginner";

  const pct = (score / puzzleMaxScore) * 100;

  // Iterate from highest to lowest to find the best rank achieved
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (pct >= RANKS[i].threshold) {
      return RANKS[i].name;
    }
  }

  return "Beginner";
}
