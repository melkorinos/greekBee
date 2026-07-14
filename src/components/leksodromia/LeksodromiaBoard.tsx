"use client";

// LeksodromiaBoard — the anagram-sprint play surface.
// Scrambled tile rack → answer row; live decaying points counter; hint /
// two-phase skip / submit actions; end-of-round recap + single score post.
// All game state lives in useLeksodromiaRound (reducer + clock + persistence).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  migrateLeksiarxeioIdentity,
  setDisplayName as saveDisplayName,
} from "@/hooks/useGameStore";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import type { LeksodromiaLength } from "@/games/leksodromia/types";
import {
  getCurrentInput,
  getTotalScore,
} from "@/games/leksodromia/lib/leksodromiaReducer";
import { computeWordPoints } from "@/games/leksodromia/lib/scoring";
import { useLeksodromiaRound } from "@/games/leksodromia/hooks/useLeksodromiaRound";
import { normalizeLetters } from "@/lib/normalize";

import { LeksodromiaLeaderboardModal } from "./LeksodromiaLeaderboardModal";
import { RoundRecap } from "./RoundRecap";

const GREEK_LETTER = /^[α-ωά-ώςΑ-ΩΆ-Ώ]$/;

interface LeksodromiaBoardProps {
  puzzle:             { date: string; words: string[]; scrambles: string[] };
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
  if (typeof window !== "undefined") migrateLeksiarxeioIdentity();
  const { deviceId, displayName, setDeviceId, setDisplayName } = useGameIdentity();
  const { profileLinked, createProfile, generateTransferCode, claimTransferCode, disconnect } =
    useProfile({
      deviceId,
      onDeviceIdChange:    setDeviceId,
      onDisplayNameChange: (name) => { setDisplayName(name); saveDisplayName(name); },
    });
  const { authLinked, authUserName, signInWithGoogle, signOut } = useAuth();

  const { submit: postFinalScore } = useScoreSubmission({
    gameId:     "leksodromia",
    puzzleDate: today,
    deviceId,
    displayName,
  });

  const round = useLeksodromiaRound(puzzle);
  const { state, dispatch, elapsedMs, submitWord, skipWord, setPaused } = round;

  useEffect(() => { setPaused(paused); }, [paused, setPaused]);

  // ── Two-phase skip ──────────────────────────────────────────────────────────
  // Disarmed by every action handler below — the word can only advance through
  // them, so no wordIndex effect is needed.
  const [skipArmed, setSkipArmed] = useState(false);

  // ── Score post — only when the round finishes LIVE, never on a restored
  // finished round (the guard: the player must have acted this session).
  const userActedRef = useRef(false);
  const finishedHandledRef = useRef(false);
  useEffect(() => {
    if (state.status !== "finished" || finishedHandledRef.current) return;
    finishedHandledRef.current = true;
    if (!userActedRef.current) return;
    postFinalScore(getTotalScore(state));
    const t = setTimeout(onOpenLeaderboard, 1500);
    return () => clearTimeout(t);
  }, [state, postFinalScore, onOpenLeaderboard]);

  // ── Input handlers ──────────────────────────────────────────────────────────

  // Auto-submit fires the moment a pick fills the last slot. Both dispatches are
  // queued in one handler, so the reducer applies the pick first and SUBMIT_WORD
  // then sees the completed row (a wrong word clears itself). A mis-predicted
  // call is harmless — SUBMIT_WORD no-ops on an incomplete row.
  const willCompleteRow = useCallback(() => {
    const answer = state.words[state.wordIndex] ?? "";
    return answer.length > 0 && getCurrentInput(state).length + 1 === answer.length;
  }, [state]);

  const pickTile = useCallback((tileIndex: number) => {
    userActedRef.current = true;
    setSkipArmed(false);
    const autoSubmit = willCompleteRow();
    dispatch({ type: "PICK_TILE", tileIndex });
    if (autoSubmit) submitWord();
  }, [dispatch, willCompleteRow, submitWord]);

  const addLetter = useCallback((letter: string) => {
    userActedRef.current = true;
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
    userActedRef.current = true;
    setSkipArmed(false);
    submitWord();
  }, [submitWord]);

  const confirmSkip = useCallback(() => {
    userActedRef.current = true;
    setSkipArmed(false);
    skipWord();
  }, [skipWord]);

  // Physical keyboard
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (state.status !== "playing") return;
      if (e.key === "Enter")     return submit();
      if (e.key === "Backspace") return removeLetter();
      if (GREEK_LETTER.test(e.key)) addLetter(e.key);
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // ── Derived view state ──────────────────────────────────────────────────────

  const totalWords  = state.words.length;
  const totalScore  = getTotalScore(state);
  const answer      = state.words[state.wordIndex] ?? "";
  const scramble    = state.scrambles[state.wordIndex] ?? "";
  const input       = getCurrentInput(state);
  const length      = (answer.length || 4) as LeksodromiaLength;
  const livePoints  = computeWordPoints(elapsedMs, length, state.hintsUsed);
  const usedTiles   = new Set([...state.lockedTileIdxs, ...state.picked]);

  if (state.status === "finished") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 w-full">
        <RoundRecap results={state.results} totalScore={totalScore} />
        <button onClick={onOpenLeaderboard} className="text-sm text-muted underline hover:text-foreground transition-colors">
          🏆 Δες τον πίνακα σκορ
        </button>
        <LeksodromiaLeaderboardModal
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
    <div className="flex flex-col items-center gap-4 py-4 w-full max-w-sm">
      {/* Progress + scores */}
      <div className="flex items-center justify-between w-full text-sm text-muted">
        <span className="font-semibold text-foreground">
          Λέξη {state.wordIndex + 1}/{totalWords}
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

      {/* Answer row — dashed empty slots read as targets; filled slots go solid */}
      <div data-testid="answer-row" className="flex gap-1.5">
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

      {/* Scrambled rack — circular pressable tiles, set well apart from the row */}
      <div className="flex gap-2 flex-wrap justify-center mt-4">
        {[...scramble].map((letter, i) => {
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

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          onClick={removeLetter}
          aria-label="Διαγραφή γράμματος"
          className="px-4 py-2 rounded-full border border-border text-foreground text-sm font-medium hover:bg-surface-raised active:bg-border transition-colors"
        >
          ⌫
        </button>
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
            aria-label="Σίγουρα; Παράλειψη για 0 πόντους"
            className="px-4 py-2 rounded-full bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Σίγουρα; (0 πόντοι)
          </button>
        ) : (
          <button
            onClick={() => setSkipArmed(true)}
            aria-label="Παράλειψη λέξης"
            className="px-4 py-2 rounded-full border border-border text-muted text-sm font-medium hover:bg-surface-raised active:bg-border transition-colors"
          >
            ⏭️ Παράλειψη
          </button>
        )}
      </div>

      <LeksodromiaLeaderboardModal
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
