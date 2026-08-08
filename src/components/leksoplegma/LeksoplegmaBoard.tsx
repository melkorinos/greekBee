"use client";

// LeksoplegmaBoard — the word-web play surface.
// Owns the in-progress trace (tap-built or dragged); the reducer owns
// everything else. Both control schemes submit the same TRACE_WORD action.
// Extra words (bonusWords) score flat points all round (soft collapse keeps
// dimmed edges traceable). Auto-submit fires on REQUIRED words only — many
// extras are prefixes of required words (λογο → λογουσ), so extras submit on
// drag-release or via the ✓ button when tap-building.
// Score posts CONTINUOUSLY on every live increase (most players won't finish
// all 9 — partial rounds still reach the leaderboard; useScoreSubmission's
// strictly-increasing guard dedups). Restored state never posts.

import { useCallback, useMemo, useRef, useState } from "react";

import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { useLiveScorePost } from "@/hooks/useLiveScorePost";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import { LEKSOPLEGMA } from "@/config/gameRules";
import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";
import { edgeKey, edgesOf, liveEdges, liveTiles } from "@/games/leksoplegma/lib/graph";
import { getRoundScore } from "@/games/leksoplegma/lib/leksoplegmaReducer";
import { useLeksoplegmaRound } from "@/games/leksoplegma/hooks/useLeksoplegmaRound";

import { todayISO } from "@/lib/puzzleDate";
import { LeksoplegmaGrid } from "./LeksoplegmaGrid";
import { GameLeaderboardModal } from "@/components/shared/GameLeaderboardModal";
import { LeksoplegmaRecap } from "./LeksoplegmaRecap";

/** Hints are gone from the UX — the grid never highlights a hint start tile. */
const NO_HINT_TILES: ReadonlySet<number> = new Set();

interface LeksoplegmaBoardProps {
  puzzle:             LeksoplegmaPuzzle;
  today:              string;
  isLeaderboardOpen:  boolean;
  onOpenLeaderboard:  () => void;
  onCloseLeaderboard: () => void;
}

export function LeksoplegmaBoard({
  puzzle,
  today,
  isLeaderboardOpen,
  onOpenLeaderboard,
  onCloseLeaderboard,
}: LeksoplegmaBoardProps) {
  const identity = usePlayerIdentity();
  const { deviceId, displayName } = identity;

  const { state, dispatch, hasLiveActed } = useLeksoplegmaRound(puzzle, today);
  const totalScore = getRoundScore(state);

  const { submit: postFinalScore } = useScoreSubmission({
    gameId:      "leksoplegma",
    puzzleDate:  today,
    deviceId,
    displayName,
  });

  // ── Trace (tap-built or dragged) ────────────────────────────────────────────
  // A ref mirrors the state so drag extension reads synchronously per pointermove.

  const [trace, setTrace] = useState<number[]>([]);
  const traceRef = useRef(trace);
  const updateTrace = useCallback((next: number[]) => {
    traceRef.current = next;
    setTrace(next);
  }, []);

  // Soft collapse: the full authored web stays traceable for the whole round
  // (constant per puzzle); the live subset only drives bright-vs-dim styling.
  const webEdgeSet = useMemo(() => edgesOf(puzzle.paths), [puzzle.paths]);
  const webTileSet = useMemo(() => liveTiles(puzzle.paths, []), [puzzle.paths]);
  const live        = liveTiles(puzzle.paths, state.foundRequired);
  const liveEdgeSet = liveEdges(puzzle.paths, state.foundRequired);

  /** Append `tile` if the web allows it; null when the move is illegal. */
  const extended = useCallback((current: number[], tile: number): number[] | null => {
    if (!webTileSet.has(tile) || current.includes(tile)) return null;
    if (current.length === 0) return [tile];
    if (!webEdgeSet.has(edgeKey(current[current.length - 1], tile))) return null;
    return [...current, tile];
  }, [webTileSet, webEdgeSet]);

  // Continuous posting + finish-once leaderboard open live in the shared policy
  // hook; the spine's hasLiveActed keeps restored rounds from posting.
  useLiveScorePost({
    score:        totalScore,
    isFinished:   state.status === "finished",
    hasLiveActed,
    post:         postFinalScore,
    onFinish:     onOpenLeaderboard,
  });

  // ── Actions ─────────────────────────────────────────────────────────────────

  const submitTrace = useCallback(() => {
    const current = traceRef.current;
    updateTrace([]);
    if (current.length < 2) return; // stray tap-release — clear silently
    dispatch({ type: "TRACE_WORD", trace: current });
  }, [dispatch, updateTrace]);

  /**
   * True when `word` — traced either direction — is a still-unfound REQUIRED
   * word, so a tap-built trace can auto-submit the moment it spells one.
   * Deliberately never matches extras: many are prefixes of required words
   * (λογο → λογουσ), and auto-submitting them would make the longer word
   * impossible to tap-build. Extras submit via drag-release or the ✓ button.
   */
  const completesWord = useCallback((word: string) => {
    const reversed = [...word].reverse().join("");
    return [word, reversed].some(
      (w) => w in puzzle.paths && !state.foundRequired.includes(w),
    );
  }, [puzzle.paths, state.foundRequired]);

  const onTapTile = useCallback((tile: number) => {
    const current = traceRef.current;
    if (current[current.length - 1] === tile) {
      updateTrace(current.slice(0, -1)); // tap the trace end to undo it
      return;
    }
    const next = extended(current, tile);
    if (!next) return;
    updateTrace(next); // sets traceRef synchronously so submitTrace can read it
    // Auto-submit the moment the tapped trace spells a fresh word — no button.
    if (next.length >= 2 && completesWord(next.map((i) => puzzle.letters[i]).join(""))) {
      submitTrace();
    }
  }, [extended, updateTrace, completesWord, submitTrace, puzzle.letters]);

  const onDragExtend = useCallback((tile: number) => {
    const current = traceRef.current;
    if (current.length >= 2 && current[current.length - 2] === tile) {
      updateTrace(current.slice(0, -1)); // dragging backwards pops the last tile
      return;
    }
    const next = extended(current, tile);
    if (next) updateTrace(next);
  }, [extended, updateTrace]);

  // ── Derived view state ──────────────────────────────────────────────────────

  const requiredTotal = Object.keys(puzzle.paths).length;
  const buildingWord  = trace.map((i) => puzzle.letters[i]).join("");

  if (state.status === "finished") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 w-full">
        <LeksoplegmaRecap
          foundRequired={state.foundRequired}
          foundBonus={state.foundBonus}
          hintsUsed={state.hintsUsed}
          totalScore={totalScore}
        />
        <button onClick={onOpenLeaderboard} className="text-sm text-muted underline hover:text-foreground transition-colors">
          🏆 Δες τον πίνακα σκορ
        </button>
        <GameLeaderboardModal
          gameId="leksoplegma"
          isOpen={isLeaderboardOpen}
          today={todayISO()}
          defaultDate={today}
          onClose={onCloseLeaderboard}
          {...identity.leaderboardProps}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4 w-full max-w-game">
      {/* Progress + score */}
      <div className="flex items-center justify-between w-full text-sm text-muted">
        <span className="font-semibold text-foreground">
          Λέξεις {state.foundRequired.length}/{requiredTotal}
        </span>
        <span data-testid="bonus-count" className="tabular-nums">
          Έξτρα <span className="font-mono font-bold text-foreground">{state.foundBonus.length}</span>
        </span>
        <span data-testid="total-score" className="tabular-nums">
          Σύνολο <span className="font-mono font-bold text-foreground">{totalScore}</span>
        </span>
      </div>

      <div className="h-8">
        <FeedbackBanner
          message={state.wrongTrace && trace.length === 0 ? "Δεν υπάρχει αυτή η λέξη — ή τη βρήκες ήδη" : null}
          variant="error"
        />
      </div>

      {/* Building word + submit + clear. Required words auto-submit (tap: on the
          letter that finishes one; drag: on release); the ✓ lets tap-builders
          submit extras, which never auto-submit (prefix problem). */}
      <div className="flex items-center gap-2 h-10">
        <span
          data-testid="building-word"
          className="min-w-24 px-3 py-1.5 rounded-lg border border-border bg-surface text-center text-lg font-bold uppercase tracking-widest text-foreground"
        >
          {buildingWord}
        </span>
        <button
          onClick={submitTrace}
          disabled={trace.length < 2}
          aria-label="Καταχώρηση"
          className="px-3 py-2 rounded-full border border-border text-foreground text-sm font-medium hover:bg-surface-raised disabled:opacity-40 transition-colors"
        >
          ✓
        </button>
        <button
          onClick={() => updateTrace([])}
          disabled={trace.length === 0}
          aria-label="Καθαρισμός"
          className="px-3 py-2 rounded-full border border-border text-foreground text-sm font-medium hover:bg-surface-raised disabled:opacity-40 transition-colors"
        >
          ✕
        </button>
      </div>

      <LeksoplegmaGrid
        letters={puzzle.letters}
        webTiles={webTileSet}
        webEdgeKeys={webEdgeSet}
        liveTiles={live}
        liveEdgeKeys={liveEdgeSet}
        trace={trace}
        hintStartTiles={NO_HINT_TILES}
        onTapTile={onTapTile}
        onDragExtend={onDragExtend}
        onDragRelease={submitTrace}
      />

      {/* Words found so far */}
      {state.foundRequired.length > 0 && (
        <div className="w-full flex flex-col gap-1.5 text-sm">
          <p className="text-center text-muted">Βρήκες</p>
          <ul data-testid="found-words" className="flex flex-wrap gap-1.5 justify-center">
            {state.foundRequired.map((word) => (
              <li
                key={word}
                className="px-2 py-1 rounded-full border border-border bg-surface-raised text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                {word} <span className="font-mono text-muted">+{word.length * LEKSOPLEGMA.POINTS_PER_LETTER}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extra words found — flat points, never needed to finish */}
      {state.foundBonus.length > 0 && (
        <div className="w-full flex flex-col gap-1.5 text-sm">
          <p className="text-center text-muted">Έξτρα λέξεις</p>
          <ul data-testid="bonus-words" className="flex flex-wrap gap-1.5 justify-center">
            {state.foundBonus.map((word) => (
              <li
                key={word}
                className="px-2 py-1 rounded-full border border-border bg-surface text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {word} <span className="font-mono">+{LEKSOPLEGMA.BONUS_WORD_POINTS}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <GameLeaderboardModal
        gameId="leksoplegma"
        isOpen={isLeaderboardOpen}
        today={today}
        onClose={onCloseLeaderboard}
        {...identity.leaderboardProps}
      />
    </div>
  );
}
