// rankDisplay — derives rank display state from score and maxScore.
// Used by ScoreBar to drive the progress bar, next-rank hint, and ladder popover.
// Kept here (component layer) rather than in the game lib because its output is
// shaped for rendering, not for game rules.

import { RANKS } from "@/games/leksokipos/lib";
import type { RankName } from "@/games/leksokipos/types";

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

export function rankProgress(
  score: number,
  puzzleMaxScore: number,
  currentRank: RankName,
): RankProgress {
  // Clamp to the lowest rank if currentRank isn't on the ladder. This guards
  // against a stale persisted rank name (e.g. an old name from localStorage saved
  // before a rank rename) — without it, findIndex → -1 → RANKS[-1] throws.
  const rawIdx        = RANKS.findIndex((r) => r.name === currentRank);
  const currentIdx    = rawIdx === -1 ? 0 : rawIdx;
  const nextRankEntry = RANKS[currentIdx + 1] ?? null;

  let pct                   = 100;
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
