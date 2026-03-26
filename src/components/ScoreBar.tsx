"use client";

// ScoreBar — displays the player's score, current rank and a visual progress bar.
// The bar shows progress from the current rank threshold to the next rank threshold
// so it always feels achievable and resets on each level-up.

import { RANKS } from "@/lib/ranking";
import type { RankName } from "@/types";

interface ScoreBarProps {
  score: number;
  maxScore: number;
  currentRank: RankName;
}

// ── Class constants ──────────────────────────────────────────────────────────
const styles = {
  container:   "w-full space-y-2",
  labelRow:    "flex items-baseline justify-between text-sm",
  rankLabel:   "font-semibold text-stone-800",
  scoreLabel:  "text-stone-500",
  nextLabel:   "text-xs text-stone-400 text-right",
  track:       "relative h-3 w-full rounded-full bg-stone-200",
  fill:        "h-full rounded-full bg-yellow-400 transition-all duration-500",
};

export function ScoreBar({ score, maxScore, currentRank }: ScoreBarProps) {
  const currentIdx = RANKS.findIndex((r) => r.name === currentRank);
  const nextRank   = RANKS[currentIdx + 1] ?? null;

  let pct         = 100;
  let ptsToNext: number | null = null;

  if (nextRank && maxScore > 0) {
    // Convert rank thresholds (percentages) to actual point values
    const currentPts = Math.ceil((RANKS[currentIdx].threshold / 100) * maxScore);
    const nextPts    = Math.ceil((nextRank.threshold / 100) * maxScore);
    const span       = nextPts - currentPts;

    pct       = span > 0 ? Math.min(((score - currentPts) / span) * 100, 100) : 100;
    ptsToNext = Math.max(nextPts - score, 0);
  }

  return (
    <div data-testid="score-bar" className={styles.container}>
      {/* Rank + score label */}
      <div className={styles.labelRow}>
        <span data-testid="rank-label" className={styles.rankLabel}>
          {currentRank}
        </span>
        <span data-testid="score-label" className={styles.scoreLabel}>
          {score} pts
        </span>
      </div>

      {/* Progress bar — current rank → next rank */}
      <div className={styles.track}>
        <div
          data-testid="score-bar-fill"
          className={styles.fill}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Next rank hint */}
      {nextRank && ptsToNext !== null && (
        <p className={styles.nextLabel}>
          {ptsToNext > 0
            ? `${ptsToNext} pts to ${nextRank.name}`
            : `${nextRank.name} reached!`}
        </p>
      )}
    </div>
  );
}
