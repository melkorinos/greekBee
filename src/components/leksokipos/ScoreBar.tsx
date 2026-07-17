"use client";

// ScoreBar — displays the player's score, current rank and a visual progress bar.
// The bar shows progress from the current rank threshold to the next rank threshold
// so it always feels achievable and resets on each level-up.
//
// Once the player reaches the top rank (Απολυτότητα) on a daily puzzle, the
// rank-ladder popup is replaced by the Endgame panel (remaining word counts).
// Pass `endgameInfo` to activate it.

import { btnHeaderIcon, btnHeaderIconSize } from "@/styles/recipes";
import { scoreBarFill, scoreBarTrack } from "./styles";
import { useEffect, useRef, useState } from "react";

import type { RankName } from "@/games/leksokipos/types";
import type { EndgameInfo } from "@/games/leksokipos/lib";
import { getRankEmoji } from "@/games/leksokipos/lib";
import { rankProgress } from "./rankDisplay";

interface ScoreBarProps {
  score:              number;
  maxScore:           number;
  currentRank:        RankName;
  endgameInfo?:       EndgameInfo;
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

export function ScoreBar({ score, maxScore, currentRank, endgameInfo, onOpenLeaderboard }: ScoreBarProps) {
  const [showPanel, setShowPanel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { pct, ptsToNext, nextRank, ladder } = rankProgress(score, maxScore, currentRank);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showPanel) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showPanel]);

  const isEndgame = endgameInfo !== undefined;

  return (
    <div ref={containerRef} data-testid="score-bar" className={styles.container}>
      {/* Rank + score label */}
      <div className={styles.labelRow}>
        <button
          onClick={() => setShowPanel((v) => !v)}
          aria-label={isEndgame ? "Εμφάνιση λέξεων που απομένουν" : "Εμφάνιση επιπέδων"}
          aria-expanded={showPanel}
          className="flex items-center gap-1.5 group"
        >
          <span className={`${btnHeaderIconSize} ${btnHeaderIcon} group-hover:bg-surface-raised group-hover:text-accent`}>
            <RankIcon />
          </span>
          <span
            data-testid="rank-label"
            className={styles.rankLabel}
          >
            {currentRank} {getRankEmoji(currentRank)}
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
              className={`${btnHeaderIconSize} ${btnHeaderIcon} text-trophy leading-none`}
            >
              🏆
            </button>
          )}
        </div>
      </div>

      {/* Popup — endgame panel OR rank ladder */}
      {showPanel && (
        isEndgame ? (
          <div data-testid="endgame-panel" className="rounded-xl border border-border bg-surface shadow-md p-3 space-y-1">
            <div className="flex justify-between text-sm font-semibold text-foreground px-2 pb-1">
              <span>Λέξεις που απομένουν</span>
              <span>{endgameInfo.remainingTotal}</span>
            </div>
            <div className="flex justify-between text-sm px-2">
              <span className="text-muted">Πανόγραμμα</span>
              <span className="text-foreground">{endgameInfo.remainingPangrams}</span>
            </div>
            {endgameInfo.byLength.length > 0 && (
              <div className="border-t border-border pt-1 mt-1 space-y-0.5">
                {endgameInfo.byLength.map(({ length, count }) => (
                  <div key={length} className="flex justify-between text-sm px-2">
                    <span className="text-muted">{length}γρ</span>
                    <span className="text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
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
                <span>{row.name} {row.emoji}</span>
                <span>{row.pts} pts</span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Progress bar — current rank → next rank */}
      <div className={scoreBarTrack}>
        <div
          data-testid="score-bar-fill"
          className={scoreBarFill}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Next rank hint — hidden once at max score */}
      {!isEndgame && nextRank && ptsToNext !== null && (
        <p className={styles.nextLabel}>
          {ptsToNext > 0 ? (
            <>{ptsToNext} pts για: <span className="text-foreground">{nextRank} {getRankEmoji(nextRank)}</span></>
          ) : (
            <>Έφτασες: <span className="text-foreground">{nextRank} {getRankEmoji(nextRank)}</span>! 🎉</>
          )}
        </p>
      )}
    </div>
  );
}
