"use client";

// LeksoplegmaBoard — the word-web play surface.
// Owns the in-progress trace (tap-built or dragged); the reducer owns
// everything else. Both control schemes submit the same TRACE_WORD action.
// Score posts once, when the last required word is found LIVE — never on a
// restored finished round.

import { useCallback, useEffect, useRef, useState } from "react";

import {
  migrateLeksiarxeioIdentity,
  setDisplayName as saveDisplayName,
} from "@/hooks/useGameStore";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import { LEKSOPLEGMA } from "@/config/gameRules";
import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";
import { edgeKey, liveEdges, liveTiles } from "@/games/leksoplegma/lib/graph";
import { getRoundScore } from "@/games/leksoplegma/lib/leksoplegmaReducer";
import { isPerfectRound } from "@/games/leksoplegma/lib/scoring";
import { useLeksoplegmaRound } from "@/games/leksoplegma/hooks/useLeksoplegmaRound";

import { LeksoplegmaGrid } from "./LeksoplegmaGrid";
import { LeksoplegmaLeaderboardModal } from "./LeksoplegmaLeaderboardModal";
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
  if (typeof window !== "undefined") migrateLeksiarxeioIdentity();
  const { deviceId, displayName, setDeviceId, setDisplayName } = useGameIdentity();
  const { profileLinked, createProfile, generateTransferCode, claimTransferCode, disconnect } =
    useProfile({
      deviceId,
      onDeviceIdChange:    setDeviceId,
      onDisplayNameChange: (name) => { setDisplayName(name); saveDisplayName(name); },
    });
  const { authLinked, authUserName, signInWithGoogle, signOut } = useAuth();

  const { state, dispatch } = useLeksoplegmaRound(puzzle, today);
  const totalScore = getRoundScore(state);

  const { submit: postFinalScore } = useScoreSubmission({
    gameId:      "leksoplegma",
    puzzleDate:  today,
    deviceId,
    displayName,
    isPerfect:   state.status === "finished" && isPerfectRound(state.hintsUsed),
  });

  // ── Trace (tap-built or dragged) ────────────────────────────────────────────
  // A ref mirrors the state so drag extension reads synchronously per pointermove.

  const [trace, setTrace] = useState<number[]>([]);
  const traceRef = useRef(trace);
  const updateTrace = useCallback((next: number[]) => {
    traceRef.current = next;
    setTrace(next);
  }, []);

  const live      = liveTiles(puzzle.paths, state.foundRequired);
  const liveEdgeSet = liveEdges(puzzle.paths, state.foundRequired);
  const liveRef   = useRef({ live, liveEdgeSet });
  useEffect(() => { liveRef.current = { live, liveEdgeSet }; });

  /** Append `tile` if the live graph allows it; null when the move is illegal. */
  const extended = useCallback((current: number[], tile: number): number[] | null => {
    const { live: liveNow, liveEdgeSet: edgesNow } = liveRef.current;
    if (!liveNow.has(tile) || current.includes(tile)) return null;
    if (current.length === 0) return [tile];
    if (!edgesNow.has(edgeKey(current[current.length - 1], tile))) return null;
    return [...current, tile];
  }, []);

  // ── Score post — live finish only ───────────────────────────────────────────

  const userActedRef = useRef(false);
  const finishedHandledRef = useRef(false);
  useEffect(() => {
    if (state.status !== "finished" || finishedHandledRef.current) return;
    finishedHandledRef.current = true;
    if (!userActedRef.current) return;
    postFinalScore(getRoundScore(state));
    const t = setTimeout(onOpenLeaderboard, 1500);
    return () => clearTimeout(t);
  }, [state, postFinalScore, onOpenLeaderboard]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const submitTrace = useCallback(() => {
    const current = traceRef.current;
    updateTrace([]);
    if (current.length < 2) return; // stray tap-release — clear silently
    userActedRef.current = true;
    dispatch({ type: "TRACE_WORD", trace: current });
  }, [dispatch, updateTrace]);

  /** True when `word` is a still-unfound required or bonus word — an auto-submit. */
  const completesWord = useCallback((word: string) => {
    return (
      (word in puzzle.paths && !state.foundRequired.includes(word)) ||
      (puzzle.bonusWords.includes(word) && !state.foundBonus.includes(word))
    );
  }, [puzzle, state.foundRequired, state.foundBonus]);

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
        <LeksoplegmaLeaderboardModal
          isOpen={isLeaderboardOpen}
          today={today}
          deviceId={deviceId}
          displayName={displayName}
          profileLinked={profileLinked}
          onSaveName={(name) => { setDisplayName(name); saveDisplayName(name); }}
          onProfileCreate={createProfile}
          onTransferGenerate={generateTransferCode}
          onTransferClaim={claimTransferCode}
          onDisconnect={disconnect}
          authLinked={authLinked}
          authUserName={authUserName}
          onSignIn={signInWithGoogle}
          onSignOut={signOut}
          onClose={onCloseLeaderboard}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4 w-full max-w-sm">
      {/* Progress + score */}
      <div className="flex items-center justify-between w-full text-sm text-muted">
        <span className="font-semibold text-foreground">
          Λέξεις {state.foundRequired.length}/{requiredTotal}
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

      {/* Building word + clear. No submit button — a completed word auto-submits
          (tap: on the letter that finishes it; drag: on release). */}
      <div className="flex items-center gap-2 h-10">
        <span
          data-testid="building-word"
          className="min-w-24 px-3 py-1.5 rounded-lg border border-border bg-surface text-center text-lg font-bold uppercase tracking-widest text-foreground"
        >
          {buildingWord}
        </span>
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
        liveTiles={live}
        liveEdgeKeys={liveEdgeSet}
        trace={trace}
        hintStartTiles={NO_HINT_TILES}
        onTapTile={onTapTile}
        onDragExtend={onDragExtend}
        onDragRelease={submitTrace}
      />

      {/* Found + bonus */}
      <div className="w-full flex flex-col gap-1 text-sm">
        <p data-testid="bonus-counter" className="text-center text-muted">
          ✨ Έξτρα λέξεις: <span className="font-semibold text-foreground">{state.foundBonus.length}</span>
          {" · "}
          <span className="font-mono">+{state.foundBonus.length * LEKSOPLEGMA.BONUS_WORD_POINTS}</span>
        </p>
        {state.foundRequired.length > 0 && (
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
        )}
      </div>

      <LeksoplegmaLeaderboardModal
        isOpen={isLeaderboardOpen}
        today={today}
        deviceId={deviceId}
        displayName={displayName}
        profileLinked={profileLinked}
        onSaveName={(name) => { setDisplayName(name); saveDisplayName(name); }}
        onProfileCreate={createProfile}
        onTransferGenerate={generateTransferCode}
        onTransferClaim={claimTransferCode}
        onDisconnect={disconnect}
        authLinked={authLinked}
        authUserName={authUserName}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
        onClose={onCloseLeaderboard}
      />
    </div>
  );
}
