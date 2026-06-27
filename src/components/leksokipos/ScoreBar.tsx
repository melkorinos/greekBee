"use client";

// ScoreBar — displays the player's score, current rank and a visual progress bar.
// The bar shows progress from the current rank threshold to the next rank threshold
// so it always feels achievable and resets on each level-up.

import { scoreBarFill, scoreBarTrack } from "@/styles/recipes";
import { useEffect, useRef, useState } from "react";

import type { RankName } from "@/games/leksokipos/types";
import { getRankEmoji } from "@/games/leksokipos/lib";
import { rankProgress } from "./rankDisplay";

interface ScoreBarProps {
  score: number;
  maxScore: number;
  currentRank: RankName;
  onOpenLeaderboard?: () => void;
}

// ── Class constants ──────────────────────────────────────────────────────────
const styles = {
  container:   "w-full space-y-2",
  labelRow:    "flex items-center justify-between text-sm",
  rankLabel:   "font-semibold text-foreground",
  scoreLabel:  "text-muted",
  nextLabel:   "text-xs text-muted text-right",
};

/** Three bars of increasing height — ranking ladder icon */
function RankIcon() {
  return (
    <svg width="17.6" height="15.4" viewBox="0 0 16 14" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="4" height="6" rx="1" />
      <rect x="6" y="4" width="4" height="10" rx="1" />
      <rect x="12" y="0" width="4" height="14" rx="1" />
    </svg>
  );
}

export function ScoreBar({ score, maxScore, currentRank, onOpenLeaderboard }: ScoreBarProps) {
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
        <button
          onClick={() => setShowRanks((v) => !v)}
          aria-label="Εμφάνιση επιπέδων"
          aria-expanded={showRanks}
          className="flex items-center gap-1.5 group -ml-1 px-1 py-0.5 rounded-lg hover:bg-surface-raised transition-colors"
        >
          <span className="text-muted group-hover:text-accent transition-colors">
            <RankIcon />
          </span>
          <span
            data-testid="rank-label"
            className={`${styles.rankLabel} underline decoration-1 underline-offset-4 decoration-muted/70 group-hover:decoration-accent`}
          >
            {getRankEmoji(currentRank)} {currentRank}
          </span>
          <span
            aria-hidden="true"
            className={`text-muted text-[0.85rem] leading-none transition-transform ${showRanks ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span data-testid="score-label" className={styles.scoreLabel}>
            {score} pts
          </span>
          {onOpenLeaderboard && (
            <button
              data-testid="btn-leaderboard"
              onClick={onOpenLeaderboard}
              aria-label="Πίνακας Σκορ"
              className="text-trophy text-muted hover:text-accent transition-colors leading-none"
            >
              🏆
            </button>
          )}
        </div>
      </div>

      {/* Rank ladder popover */}
      {showRanks && (
        <div className="rounded-xl border border-border bg-surface shadow-md p-3 space-y-1">
          {ladder.map((row) => (
            <div
              key={row.name}
              className={`flex justify-between text-sm px-2 py-0.5 rounded-lg ${
                row.isActive
                  ? "bg-brand/20 font-semibold text-foreground"
                  : row.achieved
                  ? "text-muted"
                  : "text-muted/60"
              }`}
            >
              <span>{row.emoji} {row.name}</span>
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
          {ptsToNext > 0 ? (
            <>{ptsToNext} pts για: <span className="text-foreground">{getRankEmoji(nextRank)} {nextRank}</span></>
          ) : (
            <>Έφτασες: <span className="text-foreground">{getRankEmoji(nextRank)} {nextRank}</span>! 🎉</>
          )}
        </p>
      )}
    </div>
  );
}
