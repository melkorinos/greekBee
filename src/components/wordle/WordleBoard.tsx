"use client";

// Top-level Wordle board — assembles GuessGrid + Keyboard + feedback message.
// Wires physical keyboard events.

import { useEffect, useLayoutEffect, useRef } from "react";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import { GuessGrid } from "./GuessGrid";
import { Keyboard } from "./Keyboard";
import type { WordlePuzzle } from "@/games/wordle/types";
import { useWordleState } from "@/games/wordle/hooks/useWordleState";
import { normalizeLetters } from "@/games/spelling-bee/lib/normalize";

// Greek letter regex (covers the Greek alphabet range)
const GREEK_LETTER = /^[α-ωά-ώΑ-ΩΆ-Ώ]$/i;

interface WordleBoardProps {
  puzzle:      WordlePuzzle;
  validWords:  string[];
}

export function WordleBoard({ puzzle, validWords }: WordleBoardProps) {
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
  } = useWordleState(puzzle, validWords);

  // ── Physical keyboard handler ──────────────────────────────────────────────
  // Use a stable ref so the listener is registered exactly once (empty deps),
  // eliminating the window between teardown and re-registration that caused
  // rapid keystrokes to be silently dropped.
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
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
  }, []); // registered once — ref keeps the handler current

  // Auto-clear transient messages
  useEffect(() => {
    if (!lastMessage || status !== "playing") return;
    const t = setTimeout(clearMessage, 2000);
    return () => clearTimeout(t);
  }, [lastMessage, clearMessage, status]);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Feedback banner */}
      <div className="h-8">
        <FeedbackBanner
          message={lastMessage}
          variant={status === "won" ? "success" : status === "lost" ? "error" : "neutral"}
          theme="dark"
        />
      </div>

      {/* Guess grid */}
      <GuessGrid
        guesses={guesses}
        currentInput={currentInput}
        wordLength={puzzle.length}
        maxGuesses={maxGuesses}
      />

      {/* Keyboard */}
      <Keyboard
        letterStates={letterStates}
        onLetter={addLetter}
        onDelete={deleteLetter}
        onEnter={submitGuess}
        disabled={status !== "playing"}
      />
    </div>
  );
}
