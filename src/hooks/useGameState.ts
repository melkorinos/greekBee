// useGameState — the main React hook for the Spelling Bee game.
// Wires up the pure reducer with useReducer and exposes a clean API to components.

"use client";

import { buildInitialState, gameReducer } from "./gameReducer";
import { clearPersistedState, loadPersistedState, usePersistence } from "./usePersistence";
import { useCallback, useReducer } from "react";

import type { Puzzle } from "@/types";

/**
 * Central game hook — all components talk to this, never to the reducer directly.
 *
 * @param initialPuzzle - The puzzle to start with (loaded from data layer)
 */
export function useGameState(initialPuzzle: Puzzle) {
  const [state, dispatch] = useReducer(
    gameReducer,
    initialPuzzle,
    // Lazy initialiser: merge persisted progress (if any) into the initial state
    (puzzle) => {
      const base = buildInitialState(puzzle);
      const saved = loadPersistedState(puzzle);
      return saved ? { ...base, ...saved } : base;
    }
  );

  // Auto-save to localStorage whenever relevant state changes
  usePersistence(state);

  // ── Dispatch helpers ──────────────────────────────────────────────────────
  // Wrapped in useCallback so component references stay stable between renders

  /** Append a single letter to the current input */
  const addLetter = useCallback(
    (letter: string) => dispatch({ type: "ADD_LETTER", letter }),
    []
  );

  /** Remove the last letter from the current input */
  const deleteLetter = useCallback(
    () => dispatch({ type: "DELETE_LETTER" }),
    []
  );

  /** Clear the whole input field */
  const clearInput = useCallback(
    () => dispatch({ type: "CLEAR_INPUT" }),
    []
  );

  /** Submit the current input as a word guess */
  const submitWord = useCallback(
    () => dispatch({ type: "SUBMIT_WORD" }),
    []
  );

  /** Randomise the order of the outer ring letters */
  const shuffleLetters = useCallback(
    () => dispatch({ type: "SHUFFLE_LETTERS" }),
    []
  );

  /** Load a completely new puzzle, resetting all progress */
  const newGame = useCallback(
    (puzzle: Puzzle) => {
      // Wipe localStorage so the old session doesn't bleed into the new game
      clearPersistedState();
      dispatch({ type: "NEW_GAME", puzzle });
    },
    []
  );

  return {
    // ── State (read-only to consumers) ──────────────────────────────────────
    puzzle: state.puzzle,
    currentInput: state.currentInput,
    foundWords: state.foundWords,
    score: state.score,
    currentRank: state.currentRank,
    lastSubmission: state.lastSubmission,

    // ── Actions ─────────────────────────────────────────────────────────────
    addLetter,
    deleteLetter,
    clearInput,
    submitWord,
    shuffleLetters,
    newGame,
  };
}
