"use client";

// ScoreBar — displays the player's score, current rank and a visual progress bar.
// The bar shows progress from the current rank threshold to the next rank threshold
// so it always feels achievable and resets on each level-up.

import { useEffect, useRef, useState } from "react";

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
  labelRow:    "flex items-center justify-between text-sm",
  rankLabel:   "font-semibold text-stone-800",
  scoreLabel:  "text-stone-500",
  nextLabel:   "text-xs text-stone-400 text-right",
  track:       "relative h-3 w-full rounded-full bg-stone-200",
  fill:        "h-full rounded-full bg-yellow-400 transition-all duration-500",
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
          {[...RANKS].reverse().map((r) => {
            const pts = Math.ceil((r.threshold / 100) * maxScore);
            const isActive = r.name === currentRank;
            const achieved = score >= pts;
            return (
              <div
                key={r.name}
                className={`flex justify-between text-sm px-2 py-0.5 rounded-lg ${
                  isActive
                    ? "bg-yellow-100 font-semibold text-yellow-800"
                    : achieved
                    ? "text-stone-500"
                    : "text-stone-400"
                }`}
              >
                <span>{r.name}</span>
                <span>{pts} pts</span>
              </div>
            );
          })}
        </div>
      )}

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
