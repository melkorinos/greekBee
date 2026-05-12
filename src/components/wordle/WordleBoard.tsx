"use client";

// Top-level Wordle board — assembles GuessGrid + Keyboard + feedback message.
// Wires physical keyboard events.

import { GuessGrid } from "./GuessGrid";
import { Keyboard } from "./Keyboard";
import type { WordlePuzzle } from "@/games/wordle/types";
import { useEffect } from "react";
import { useWordleState } from "@/games/wordle/hooks/useWordleState";

// Greek letter regex (covers the Greek alphabet range)
const GREEK_LETTER = /^[α-ωά-ώΑ-ΩΆ-Ώ]$/i;

// Normalise a typed character to the lowercase, accent-free form we store
function normaliseChar(ch: string): string {
  return ch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace("ς", "σ");
}

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter")     return submitGuess();
      if (e.key === "Backspace") return deleteLetter();
      if (GREEK_LETTER.test(e.key)) addLetter(normaliseChar(e.key));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addLetter, deleteLetter, submitGuess]);

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
        {lastMessage && (
          <p
            className={[
              "px-4 py-1 rounded text-sm font-medium",
              status === "won"
                ? "bg-green-900 text-green-100"
                : status === "lost"
                  ? "bg-red-900 text-red-100"
                  : "bg-stone-700 text-stone-100",
            ].join(" ")}
            role="alert"
          >
            {lastMessage}
          </p>
        )}
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
