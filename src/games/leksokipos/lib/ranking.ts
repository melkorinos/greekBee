// Rank calculation — maps a player's current score to a rank name.
// Ranks are thresholds expressed as a percentage of the max possible score.
//
// RANKS is the SINGLE SOURCE OF TRUTH for rank names: `RankName` (and `Rank`)
// are derived from it below, so renaming a rank is a one-line edit here.

/**
 * Ordered rank ladder from lowest to highest threshold.
 * A player achieves a rank when their score % >= that rank's threshold.
 * Thresholds are a percentage (0–100) of the puzzle's max score.
 */
export const RANKS = [
  { name: "Ψαράκι",       threshold: 0  },
  { name: "Έτσι κιέτσι",  threshold: 6  },
  { name: "Οκέι",         threshold: 12 },
  { name: "Για πάμε",     threshold: 20 },
  { name: "Τζάμι",        threshold: 30 },
  { name: "Θηρίο",        threshold: 42 },
  { name: "Γκουρού",      threshold: 55 },
  { name: "Απολυτότητα",  threshold: 80 },
] as const;

/** Any rank name on the ladder — derived from RANKS, the single source. */
export type RankName = (typeof RANKS)[number]["name"];

/** A rank definition with its minimum score percentage threshold. */
export type Rank = { name: RankName; threshold: number };

/** The lowest rank — used as the zero-score / empty-puzzle fallback. */
const LOWEST_RANK: RankName = RANKS[0].name;

/**
 * Returns the player's current rank given their score and the puzzle's max score.
 * Walks the ladder from the top down and returns the first rank the player qualifies for.
 */
export function calculateRank(score: number, puzzleMaxScore: number): RankName {
  // Avoid division by zero on an empty puzzle
  if (puzzleMaxScore === 0) return LOWEST_RANK;

  const pct = (score / puzzleMaxScore) * 100;

  // Iterate from highest to lowest to find the best rank achieved
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (pct >= RANKS[i].threshold) {
      return RANKS[i].name;
    }
  }

  return LOWEST_RANK;
}
