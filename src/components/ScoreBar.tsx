"use client";

// ScoreBar — displays the player's score, current rank and a visual progress bar.
// Rank thresholds are rendered as tick marks so players can see upcoming ranks.

import { RANKS } from "@/lib/ranking";
import type { RankName } from "@/types";

interface ScoreBarProps {
  score: number;
  maxScore: number;
  currentRank: RankName;
}

// ── Class constants ──────────────────────────────────────────────────────────
const styles = {
  container:    "w-full space-y-2",
  labelRow:     "flex items-baseline justify-between text-sm",
  rankLabel:    "font-semibold text-stone-800",
  scoreLabel:   "text-stone-500",
  track:        "relative h-3 w-full rounded-full bg-stone-200",
  fill:         "h-full rounded-full bg-yellow-400 transition-all duration-500",
  tick:         "absolute top-0 h-full w-px bg-stone-400 opacity-50",
};

export function ScoreBar({ score, maxScore, currentRank }: ScoreBarProps) {
  // Cap the percentage at 100 just in case rounding pushes it over
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;

  return (
    <div data-testid="score-bar" className={styles.container}>
      {/* Score + rank label */}
      <div className={styles.labelRow}>
        <span data-testid="rank-label" className={styles.rankLabel}>
          {currentRank}
        </span>
        <span data-testid="score-label" className={styles.scoreLabel}>
          {score} / {maxScore} pts
        </span>
      </div>

      {/* Progress bar track */}
      <div className={styles.track}>
        {/* Filled portion */}
        <div
          data-testid="score-bar-fill"
          className={styles.fill}
          style={{ width: `${pct}%` }}
        />

        {/* Rank tick marks — one per rank except Beginner (0%) and Queen Bee (100%) */}
        {RANKS.filter((r) => r.threshold > 0 && r.threshold < 100).map((r) => (
          <div
            key={r.name}
            data-testid={`rank-tick-${r.name.toLowerCase().replace(" ", "-")}`}
            className={styles.tick}
            style={{ left: `${r.threshold}%` }}
            title={r.name}
          />
        ))}
      </div>
    </div>
  );
}
