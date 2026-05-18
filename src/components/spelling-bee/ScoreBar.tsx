"use client";

// ScoreBar — displays the player's score, current rank and a visual progress bar.
// The bar shows progress from the current rank threshold to the next rank threshold
// so it always feels achievable and resets on each level-up.

import { scoreBarFill, scoreBarTrack } from "./styles";
import { useEffect, useRef, useState } from "react";

import type { RankName } from "@/games/spelling-bee/types";
import { rankProgress } from "@/games/spelling-bee/lib/ranking";

interface ScoreBarProps {
  score: number;
  maxScore: number;
  currentRank: RankName;
}

// ── Class constants ──────────────────────────────────────────────────────────
const styles = {
  container:   "w-full space-y-2",
  labelRow:    "flex items-center justify-between text-sm",
  rankLabel:   "font-semibold text-stone-800",
  scoreLabel:  "text-stone-500",
  nextLabel:   "text-xs text-stone-400 text-right",
};

/** Three bars of increasing height — ranking ladder icon */
function RankIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="4" height="6" rx="1" />
      <rect x="6" y="4" width="4" height="10" rx="1" />
      <rect x="12" y="0" width="4" height="14" rx="1" />
    </svg>
  );
}

export function ScoreBar({ score, maxScore, currentRank }: ScoreBarProps) {
  const [showRanks, setShowRanks] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { pct, ptsToNext, nextRank, ladder } = rankProgress(score, maxScore, currentRank);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showRanks) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowRanks(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showRanks]);

  return (
    <div ref={containerRef} data-testid="score-bar" className={styles.container}>
      {/* Rank + score label */}
      <div className={styles.labelRow}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowRanks((v) => !v)}
            aria-label="Show rank thresholds"
            className="text-stone-400 hover:text-yellow-500 transition-colors"
          >
            <RankIcon />
          </button>
          <span data-testid="rank-label" className={styles.rankLabel}>
            {currentRank}
          </span>
        </div>
        <span data-testid="score-label" className={styles.scoreLabel}>
          {score} pts
        </span>
      </div>

      {/* Rank ladder popover */}
      {showRanks && (
        <div className="rounded-xl border border-stone-200 bg-white shadow-md p-3 space-y-1">
          {ladder.map((row) => (
            <div
              key={row.name}
              className={`flex justify-between text-sm px-2 py-0.5 rounded-lg ${
                row.isActive
                  ? "bg-yellow-100 font-semibold text-yellow-800"
                  : row.achieved
                  ? "text-stone-500"
                  : "text-stone-400"
              }`}
            >
              <span>{row.name}</span>
              <span>{row.pts} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar — current rank → next rank */}
      <div className={scoreBarTrack}>
        <div
          data-testid="score-bar-fill"
          className={scoreBarFill}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Next rank hint */}
      {nextRank && ptsToNext !== null && (
        <p className={styles.nextLabel}>
          {ptsToNext > 0
            ? `${ptsToNext} pts to ${nextRank}`
            : `${nextRank} reached!`}
        </p>
      )}
    </div>
  );
}
