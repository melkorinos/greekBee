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

// ─── Rank Progress ────────────────────────────────────────────────────────────

export interface RankProgressRow {
  name: RankName;
  pts: number;
  isActive: boolean;
  achieved: boolean;
}

export interface RankProgress {
  /** 0–100 fill percentage for the progress bar (current rank → next rank) */
  pct: number;
  /** Points still needed to reach the next rank, or null at the top rank */
  ptsToNext: number | null;
  /** Name of the next rank, or null when the player is at the top */
  nextRank: RankName | null;
  /** All ranks with their point thresholds, highest-first, for the ladder display */
  ladder: RankProgressRow[];
}

/**
 * Derives all rank-display state from score, puzzleMaxScore and currentRank.
 * Pure function — extracted from ScoreBar so display logic can be tested without React.
 */
export function rankProgress(
  score: number,
  puzzleMaxScore: number,
  currentRank: RankName
): RankProgress {
  const currentIdx     = RANKS.findIndex((r) => r.name === currentRank);
  const nextRankEntry  = RANKS[currentIdx + 1] ?? null;

  let pct         = 100;
  let ptsToNext: number | null = null;

  if (nextRankEntry && puzzleMaxScore > 0) {
    const currentPts = Math.ceil((RANKS[currentIdx].threshold / 100) * puzzleMaxScore);
    const nextPts    = Math.ceil((nextRankEntry.threshold / 100) * puzzleMaxScore);
    const span       = nextPts - currentPts;
    pct       = span > 0 ? Math.min(((score - currentPts) / span) * 100, 100) : 100;
    ptsToNext = Math.max(nextPts - score, 0);
  }

  const ladder: RankProgressRow[] = [...RANKS].reverse().map((r) => ({
    name:     r.name,
    pts:      Math.ceil((r.threshold / 100) * puzzleMaxScore),
    isActive: r.name === currentRank,
    achieved: score >= Math.ceil((r.threshold / 100) * puzzleMaxScore),
  }));

  return { pct, ptsToNext, nextRank: nextRankEntry?.name ?? null, ladder };
}
