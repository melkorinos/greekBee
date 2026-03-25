"use client";

// GameBoard — the top-level client component that composes all game UI pieces.
// Receives the initial puzzle as a prop (loaded server-side in page.tsx).

import { useCallback, useEffect } from "react";

import { FeedbackMessage } from "./FeedbackMessage";
import { FoundWordsList } from "./FoundWordsList";
import { HoneycombGrid } from "./HoneycombGrid";
import type { Puzzle } from "@/types";
import { ScoreBar } from "./ScoreBar";
import { WordInput } from "./WordInput";
import { maxScore } from "@/lib/scoring";
import { normalizeLetters } from "@/lib/normalize";
import { useGameState } from "@/hooks/useGameState";

interface GameBoardProps {
  puzzle: Puzzle;
}

export function GameBoard({ puzzle }: GameBoardProps) {
  const {
    puzzle: activePuzzle,
    currentInput,
    foundWords,
    score,
    currentRank,
    lastSubmission,
    addLetter,
    deleteLetter,
    clearInput,
    submitWord,
    shuffleLetters,
  } = useGameState(puzzle);

  // ── Keyboard support ───────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        submitWord();
      } else if (e.key === "Backspace") {
        deleteLetter();
      } else if (/^\p{L}$/u.test(e.key)) {
        // Normalise the typed letter so accented input (ά) matches puzzle letter (α)
        const letter = normalizeLetters(e.key);
        const allowed = new Set(
          [activePuzzle.centerLetter, ...activePuzzle.outerLetters].map(normalizeLetters)
        );
        if (allowed.has(letter)) addLetter(letter);
      }
    },
    [activePuzzle, addLetter, deleteLetter, submitWord]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const puzzleMaxScore = maxScore(activePuzzle);

// ── Class constants ──────────────────────────────────────────────────────────
const styles = {
  container:       "flex flex-col items-center gap-6 w-full max-w-sm mx-auto px-4 py-8",
  buttonRow:       "flex items-center gap-3 w-full justify-center",
  buttonSecondary: "px-4 py-2 rounded-full border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-100 active:bg-stone-200 transition-colors",
  buttonPrimary:   "px-4 py-2 rounded-full bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 active:bg-stone-900 transition-colors",
  buttonNewGame:   "text-xs text-stone-400 underline hover:text-stone-600 transition-colors",
};

  return (
    <div data-testid="game-board" className={styles.container}>

      {/* Score + rank */}
      <ScoreBar
        score={score}
        maxScore={puzzleMaxScore}
        currentRank={currentRank}
      />

      {/* Current word input display */}
      <WordInput value={currentInput} centerLetter={activePuzzle.centerLetter} />

      {/* Feedback from the last submission — disappears on next input */}
      {lastSubmission && (
        <FeedbackMessage
          word={lastSubmission.word}
          status={lastSubmission.result.status}
          points={lastSubmission.result.points}
          isPangram={lastSubmission.result.isPangram}
        />
      )}

      {/* The 7-hex honeycomb grid */}
      <HoneycombGrid
        centerLetter={activePuzzle.centerLetter}
        outerLetters={activePuzzle.outerLetters}
        onLetterClick={addLetter}
      />

      {/* Action buttons row */}
      <div className={styles.buttonRow}>
        <button
          data-testid="btn-delete"
          onClick={deleteLetter}
          className={styles.buttonSecondary}
        >
          ⌫ Delete
        </button>
        <button
          data-testid="btn-clear"
          onClick={clearInput}
          className={styles.buttonSecondary}
          aria-label="Clear input"
        >
          ✕ Clear
        </button>
        <button
          data-testid="btn-shuffle"
          onClick={shuffleLetters}
          className={styles.buttonSecondary}
          aria-label="Shuffle outer letters"
        >
          ⟳ Shuffle
        </button>
        <button
          data-testid="btn-enter"
          onClick={submitWord}
          className={styles.buttonPrimary}
        >
          Enter
        </button>
      </div>

      {/* Random Puzzle — client-side: passes current ID so server can exclude it */}
      <a
        data-testid="btn-new-game"
        href={`/?lang=${activePuzzle.language}&random=1&exclude=${activePuzzle.id}`}
        className={styles.buttonNewGame}
      >
        🎲 Random Puzzle
      </a>

      {/* Found words list */}
      <FoundWordsList words={foundWords} puzzle={activePuzzle} />
    </div>
  );
}
