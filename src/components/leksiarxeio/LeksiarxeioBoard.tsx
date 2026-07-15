"use client";

// Top-level Leksiarxeio board — assembles GuessGrid + Keyboard + feedback message.
// Manages the active word length (4–8) with a - N + switcher.
// Wires physical keyboard events and leaderboard score submission.

import type { LeksiarxeioLength, LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";
import { LEKSIARXEIO } from "@/config/gameRules";
import { readSlice } from "@/hooks/useGameStore";
import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import { GuessGrid } from "./GuessGrid";
import { Keyboard } from "./Keyboard";
import { GameLeaderboardModal } from "@/components/shared/GameLeaderboardModal";
import { normalizeLetters } from "@/lib/normalize";
import { useLeksiarxeioScoreSubmission } from "@/hooks/useLeksiarxeioScoreSubmission";
import { useLeksiarxeioState } from "@/games/leksiarxeio/hooks/useLeksiarxeioState";

// Greek letter regex (covers the Greek alphabet range)
const GREEK_LETTER = /^[α-ωά-ώΑ-ΩΆ-Ώ]$/i;

const LENGTHS: LeksiarxeioLength[] = [...LEKSIARXEIO.LENGTHS];

// ── Props ─────────────────────────────────────────────────────────────────────

interface LeksiarxeioBoardProps {
  puzzles:             LeksiarxeioPuzzle[];                      // one per length 4–8, server-provided
  wordLists:           Record<LeksiarxeioLength, string[]>;
  today:               string;                                   // YYYY-MM-DD
  isLeaderboardOpen:   boolean;
  onOpenLeaderboard:   () => void;
  onCloseLeaderboard:  () => void;
}

// ── Inner game panel — one per length ────────────────────────────────────────
// Rendered for ALL lengths but only the active one is visible,
// so each instance maintains its own independent state.

interface LengthPanelProps {
  puzzle:        LeksiarxeioPuzzle;
  validWords:    string[];
  isActive:      boolean;
  activeLength:  LeksiarxeioLength;
  onPrev:        () => void;
  onNext:        () => void;
  onGameEnd:     (length: LeksiarxeioLength, attempts: number, won: boolean) => void;
}

function LengthPanel({
  puzzle,
  validWords,
  isActive,
  activeLength,
  onPrev,
  onNext,
  onGameEnd,
}: LengthPanelProps) {
  const handleGameEnd = useCallback(
    (attempts: number, won: boolean) => onGameEnd(puzzle.length as LeksiarxeioLength, attempts, won),
    [onGameEnd, puzzle.length]
  );

  const {
    guesses,
    currentInput,
    status,
    lastMessage,
    letterStates,
    maxGuesses,
    addLetter,
    deleteLetter,
    submitGuess,
    clearMessage,
  } = useLeksiarxeioState(puzzle, validWords, handleGameEnd);

  // Physical keyboard — only active panel handles keys
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter")     return submitGuess();
      if (e.key === "Backspace") return deleteLetter();
      if (GREEK_LETTER.test(e.key)) addLetter(normalizeLetters(e.key));
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // Auto-clear transient messages
  useEffect(() => {
    if (!lastMessage || status !== "playing") return;
    const t = setTimeout(clearMessage, 2000);
    return () => clearTimeout(t);
  }, [lastMessage, clearMessage, status]);

  if (!isActive) return null;

  return (
    // w-full gives the flex column a definite width on wide screens.
    <div className="flex flex-col items-center gap-4 py-4 w-full">
      <div className="h-8">
        <FeedbackBanner
          message={lastMessage}
          variant={status === "won" ? "success" : status === "lost" ? "error" : "neutral"}
        />
      </div>

      {/*
        Single max-w-sm column: grid + switcher + keyboard all share the same
        384 px bounding box so their left/right edges always line up on any
        screen width. Without this common ancestor, the grid (w-fit) and the
        keyboard (w-full max-w-sm) centre independently and appear offset on PC.
      */}
      <div className="w-full max-w-sm flex flex-col items-center gap-4 px-2">
        {/* Grid fills the shared max-w-sm column via flex-1 tiles — no overflow possible */}
        <GuessGrid
          guesses={guesses}
          currentInput={currentInput}
          wordLength={puzzle.length}
          maxGuesses={maxGuesses}
        />

        {/* Length switcher — lives between grid and keyboard so the player
            can see the current level and change it without looking away from
            where they are typing. */}
        <div className="flex items-center gap-4">
          <button
            onClick={onPrev}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-border hover:opacity-80 text-foreground text-lg font-bold transition-opacity"
            aria-label="Μικρότερο μήκος"
          >
            −
          </button>
          <span className="text-foreground font-bold text-lg w-6 text-center tabular-nums">
            {activeLength}
          </span>
          <button
            onClick={onNext}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-border hover:opacity-80 text-foreground text-lg font-bold transition-opacity"
            aria-label="Μεγαλύτερο μήκος"
          >
            +
          </button>
        </div>

        {/* Keyboard — w-full fills the shared max-w-sm column exactly,
            so its edges align with the grid rows above. */}
        <Keyboard
          letterStates={letterStates}
          onLetter={addLetter}
          onDelete={deleteLetter}
          onEnter={submitGuess}
          disabled={status !== "playing"}
        />
      </div>
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────

export function LeksiarxeioBoard({
  puzzles,
  wordLists,
  today,
  isLeaderboardOpen,
  onOpenLeaderboard,
  onCloseLeaderboard,
}: LeksiarxeioBoardProps) {
  const [activeLength, setActiveLength] = useState<LeksiarxeioLength>(4);

  // usePlayerIdentity runs the legacy-identity migration before reading the device
  // id, then assembles device + profile + auth (see its doc comment).
  const identity = usePlayerIdentity();
  const { deviceId, displayName } = identity;

  // Track which lengths are finished (won or lost) so auto-advance can skip them.
  // A ref is used alongside state to avoid stale-closure issues inside setTimeout.
  const completedRef = useRef(new Set<LeksiarxeioLength>());
  const [, setCompletedLengths] = useState<Set<LeksiarxeioLength>>(new Set());

  // Restore already-completed lengths from persistence so auto-advance skips them.
  // The Leksiarxeio slice is a SessionMap keyed by puzzle ID (e.g. "2026-05-22-wordle-5")
  // (frozen — renaming breaks localStorage).
  useEffect(() => {
    const store = readSlice<Record<string, { status: string }>>("leksiarxeio");
    if (!store) return;
    const done = new Set<LeksiarxeioLength>();
    for (const p of puzzles) {
      const session = store[p.id];
      if (session && session.status !== "playing") {
        done.add(p.length as LeksiarxeioLength);
      }
    }
    completedRef.current = done;
    setCompletedLengths(new Set(done));
  // Intentionally runs once on mount — puzzles is stable (server-provided)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Score submission -- all posting logic lives in the hook.
  const { submitLength: postLeksiarxeioScore } = useLeksiarxeioScoreSubmission({
    puzzleDate: today,
    deviceId,
    displayName,
  });

  // Score submission + auto-advance: called by each LengthPanel when its game ends.
  //
  // Auto-advance design:
  //   1. Mark this length as completed in the ref immediately (avoids stale closure
  //      inside the timeout — using a ref means the timeout callback always reads
  //      the latest Set, not the value at callback-creation time).
  //   2. After 1.5 s, search forward (wrapping) for the first unfinished length.
  //      "Skip already-completed" means the player goes straight to their next
  //      unsolved word instead of revisiting finished rounds.
  //   3. If everything is done (or this was the last round): open the leaderboard.
  const handleGameEnd = useCallback(
    (length: LeksiarxeioLength, attempts: number, won: boolean) => {
      postLeksiarxeioScore(length, attempts, won);

      // Update the ref first so the timeout closure sees the fresh set.
      const newCompleted = new Set([...completedRef.current, length]);
      completedRef.current = newCompleted;
      setCompletedLengths(new Set(newCompleted));

      setTimeout(() => {
        const completed = completedRef.current;
        const currentIdx = LENGTHS.indexOf(length);
        let next: LeksiarxeioLength | null = null;

        // Walk forward through LENGTHS (wrapping), pick first unfinished.
        for (let i = 1; i < LENGTHS.length; i++) {
          const candidate = LENGTHS[(currentIdx + i) % LENGTHS.length];
          if (!completed.has(candidate)) {
            next = candidate;
            break;
          }
        }

        if (next) {
          setActiveLength(next);
        } else {
          // All lengths finished — surface the leaderboard.
          onOpenLeaderboard();
        }
      }, 1500);
    },
    [postLeksiarxeioScore, onOpenLeaderboard]
  );

  // Length switcher — wraps around
  function prevLength() {
    setActiveLength((l) => {
      const idx = LENGTHS.indexOf(l);
      return LENGTHS[(idx - 1 + LENGTHS.length) % LENGTHS.length];
    });
  }
  function nextLength() {
    setActiveLength((l) => {
      const idx = LENGTHS.indexOf(l);
      return LENGTHS[(idx + 1) % LENGTHS.length];
    });
  }

  return (
    <>
      {/* ── Length panels (all mounted, only active shown) ────────────────── */}
      {puzzles.map((puzzle) => (
        <LengthPanel
          key={puzzle.length}
          puzzle={puzzle}
          validWords={wordLists[puzzle.length as LeksiarxeioLength]}
          isActive={puzzle.length === activeLength}
          activeLength={activeLength}
          onPrev={prevLength}
          onNext={nextLength}
          onGameEnd={handleGameEnd}
        />
      ))}

      {/* ── Leaderboard modal ─────────────────────────────────────────────── */}
      <GameLeaderboardModal
        gameId="leksiarxeio"
        isOpen={isLeaderboardOpen}
        today={new Date().toISOString().slice(0, 10)}
        defaultDate={today}
        onClose={onCloseLeaderboard}
        {...identity.leaderboardProps}
      />
    </>
  );
}
