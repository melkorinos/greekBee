"use client";

// LeksodromiaBoard — the anagram-sprint play surface.
// Scrambled tile rack → answer row; live decaying points counter; hint /
// two-phase skip / submit actions; end-of-round recap.
// First skip requeues the word for a second chance at the end of the run
// (clock resumes); a second-chance skip is final (0 pts).
// Score posts CONTINUOUSLY on every live increase (abandoned rounds still
// reach the leaderboard; useScoreSubmission dedups). Restored state never posts.
// All game state lives in useLeksodromiaRound (reducer + clock + persistence).

import { useCallback, useEffect, useState } from "react";

import { usePhysicalKeyboard } from "@/hooks/usePhysicalKeyboard";
import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { useLiveScorePost } from "@/hooks/useLiveScorePost";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import type { LeksodromiaLength } from "@/games/leksodromia/types";
import {
  getCurrentAnswer,
  getCurrentInput,
  getCurrentScramble,
  getTotalScore,
  getTotalSteps,
  isSecondChance,
} from "@/games/leksodromia/lib/leksodromiaReducer";
import { computeWordPoints } from "@/games/leksodromia/lib/scoring";
import { useLeksodromiaRound } from "@/games/leksodromia/hooks/useLeksodromiaRound";
import { normalizeLetters } from "@/lib/normalize";
import { todayISO } from "@/lib/puzzleDate";

import { GameLeaderboardModal } from "@/components/shared/GameLeaderboardModal";
import { RoundRecap } from "./RoundRecap";

const GREEK_LETTER = /^[α-ωά-ώςΑ-ΩΆ-Ώ]$/;

interface LeksodromiaBoardProps {
  puzzle:             { date: string; words: string[]; scrambles: string[]; accepted: string[][] };
  today:              string;
  /** True while a modal (HowToPlay) covers the board — freezes the decay clock. */
  paused:             boolean;
  isLeaderboardOpen:  boolean;
  onOpenLeaderboard:  () => void;
  onCloseLeaderboard: () => void;
}

export function LeksodromiaBoard({
  puzzle,
  today,
  paused,
  isLeaderboardOpen,
  onOpenLeaderboard,
  onCloseLeaderboard,
}: LeksodromiaBoardProps) {
  const identity = usePlayerIdentity();
  const { deviceId, displayName } = identity;

  const { submit: postFinalScore } = useScoreSubmission({
    gameId:     "leksodromia",
    puzzleDate: today,
    deviceId,
    displayName,
  });

  const round = useLeksodromiaRound(puzzle);
  const { state, dispatch, elapsedMs, submitWord, skipWord, setPaused, hasLiveActed } = round;

  useEffect(() => { setPaused(paused); }, [paused, setPaused]);

  // ── Two-phase skip ──────────────────────────────────────────────────────────
  // Disarmed by every action handler below — the word can only advance through
  // them, so no wordIndex effect is needed.
  const [skipArmed, setSkipArmed] = useState(false);

  // Continuous posting + finish-once leaderboard open live in the shared policy
  // hook; the spine's hasLiveActed keeps restored rounds from posting.
  useLiveScorePost({
    score:        getTotalScore(state),
    isFinished:   state.status === "finished",
    hasLiveActed,
    post:         postFinalScore,
    onFinish:     onOpenLeaderboard,
  });

  // ── Input handlers ──────────────────────────────────────────────────────────

  // Auto-submit fires the moment a pick fills the last slot. Both dispatches are
  // queued in one handler, so the reducer applies the pick first and SUBMIT_WORD
  // then sees the completed row (a wrong word clears itself). A mis-predicted
  // call is harmless — SUBMIT_WORD no-ops on an incomplete row.
  const willCompleteRow = useCallback(() => {
    const answer = getCurrentAnswer(state);
    return answer.length > 0 && getCurrentInput(state).length + 1 === answer.length;
  }, [state]);

  const pickTile = useCallback((tileIndex: number) => {
    setSkipArmed(false);
    const autoSubmit = willCompleteRow();
    dispatch({ type: "PICK_TILE", tileIndex });
    if (autoSubmit) submitWord();
  }, [dispatch, willCompleteRow, submitWord]);

  const addLetter = useCallback((letter: string) => {
    setSkipArmed(false);
    const autoSubmit = willCompleteRow();
    dispatch({ type: "ADD_LETTER", letter: normalizeLetters(letter) });
    if (autoSubmit) submitWord();
  }, [dispatch, willCompleteRow, submitWord]);

  const removeLetter = useCallback(() => {
    setSkipArmed(false);
    dispatch({ type: "REMOVE_LETTER" });
  }, [dispatch]);

  const clearInput = useCallback(() => {
    setSkipArmed(false);
    dispatch({ type: "CLEAR_INPUT" });
  }, [dispatch]);

  const submit = useCallback(() => {
    setSkipArmed(false);
    submitWord();
  }, [submitWord]);

  const confirmSkip = useCallback(() => {
    setSkipArmed(false);
    skipWord();
  }, [skipWord]);

  usePhysicalKeyboard((e) => {
    if (state.status !== "playing") return;
    if (e.key === "Enter")     return submit();
    if (e.key === "Backspace") return removeLetter();
    if (GREEK_LETTER.test(e.key)) addLetter(e.key);
  });

  // ── Derived view state ──────────────────────────────────────────────────────

  const totalSteps   = getTotalSteps(state);
  const totalScore   = getTotalScore(state);
  const answer       = getCurrentAnswer(state);
  const scramble     = getCurrentScramble(state);
  const secondChance = isSecondChance(state);
  const input        = getCurrentInput(state);
  const length      = (answer.length || 4) as LeksodromiaLength;
  const livePoints  = computeWordPoints(elapsedMs, length, state.hintsUsed);
  const usedTiles   = new Set([...state.lockedTileIdxs, ...state.picked]);

  // Rack laid out in two rows; the top row keeps the extra tile on an odd count.
  const rackTiles = [...scramble].map((letter, i) => ({ letter, i }));
  const topCount  = Math.ceil(rackTiles.length / 2);
  const rackRows  = [rackTiles.slice(0, topCount), rackTiles.slice(topCount)];

  if (state.status === "finished") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 w-full">
        <RoundRecap results={state.results} totalScore={totalScore} />
        <button onClick={onOpenLeaderboard} className="text-sm text-muted underline hover:text-foreground transition-colors">
          🏆 Δες τον πίνακα σκορ
        </button>
        <GameLeaderboardModal
          gameId="leksodromia"
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
    <div className="flex flex-col items-center gap-4 py-4 w-full max-w-sm">
      {/* Progress + scores */}
      <div className="flex items-center justify-between w-full text-sm text-muted">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          Λέξη {state.wordIndex + 1}/{totalSteps}
          {secondChance && (
            <span data-testid="second-chance-badge" className="text-xs font-normal text-muted">
              🔁 2η ευκαιρία
            </span>
          )}
        </span>
        <span className="tabular-nums" aria-label="Πόντοι λέξης">
          ⏱️ <span className="font-mono font-bold text-foreground">{livePoints}</span>
        </span>
        <span className="tabular-nums">
          Σύνολο <span className="font-mono font-bold text-foreground">{totalScore}</span>
        </span>
      </div>

      <div className="h-8">
        <FeedbackBanner
          message={state.wrongSubmit ? "Λάθος λέξη — προσπάθησε ξανά" : null}
          variant="error"
        />
      </div>

      {/* Answer row — dashed empty slots read as targets; filled slots go solid.
          Tapping the row removes the most recent letter (replaces a ⌫ button). */}
      <div
        data-testid="answer-row"
        onClick={removeLetter}
        role="button"
        aria-label="Διαγραφή τελευταίου γράμματος"
        title="Πάτησε για διαγραφή"
        className="flex gap-1.5 cursor-pointer"
      >
        {[...answer].map((_, i) => {
          const letter = input[i] ?? "";
          const isLocked = i < state.lockedTileIdxs.length;
          const slotClass = isLocked
            ? "bg-game-accent/20 border-game-accent"
            : letter
              ? "bg-surface-raised border-border"
              : "bg-transparent border-border border-dashed";
          return (
            <div
              key={i}
              className={`flex items-center justify-center w-10 h-10 border-2 rounded-lg text-lg font-bold uppercase select-none text-foreground ${slotClass} ${state.wrongSubmit ? "border-danger" : ""}`}
            >
              {letter}
            </div>
          );
        })}
      </div>

      {/* Scrambled rack — circular pressable tiles, two rows (top row holds the
          extra tile on an odd count, e.g. 3 over 2), set apart from the row. */}
      <div className="flex flex-col gap-2 items-center mt-4">
        {rackRows.map((row, r) => (
          <div key={r} className="flex gap-2 justify-center">
            {row.map(({ letter, i }) => {
              const used = usedTiles.has(i);
              return (
                <button
                  key={i}
                  onClick={() => pickTile(i)}
                  disabled={used}
                  aria-label={`Γράμμα ${letter}`}
                  className={`flex items-center justify-center w-11 h-11 rounded-full border border-border bg-surface-raised text-lg font-bold uppercase text-foreground hover:bg-border active:scale-95 transition-all ${used ? "opacity-0 pointer-events-none" : ""}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          onClick={clearInput}
          aria-label="Καθαρισμός"
          className="px-4 py-2 rounded-full border border-border text-foreground text-sm font-medium hover:bg-surface-raised active:bg-border transition-colors"
        >
          🧹 Καθαρισμός
        </button>
        {skipArmed ? (
          <button
            onClick={confirmSkip}
            aria-label={secondChance
              ? "Σίγουρα; Οριστική παράλειψη για 0 πόντους"
              : "Σίγουρα; Η λέξη επιστρέφει στο τέλος του γύρου"}
            className="px-4 py-2 rounded-full bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {secondChance ? "Σίγουρα; (0 πόντοι)" : "Σίγουρα; (ξανά στο τέλος)"}
          </button>
        ) : (
          <button
            onClick={() => setSkipArmed(true)}
            aria-label="Επόμενη λέξη"
            className="px-4 py-2 rounded-full border border-border text-muted text-sm font-medium hover:bg-surface-raised active:bg-border transition-colors"
          >
            ⏭️ Επόμενο
          </button>
        )}
      </div>

      <GameLeaderboardModal
        gameId="leksodromia"
        isOpen={isLeaderboardOpen}
        today={todayISO()}
        defaultDate={today}
        onClose={onCloseLeaderboard}
        {...identity.leaderboardProps}
      />
    </div>
  );
}
