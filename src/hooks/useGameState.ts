// useGameState — the main React hook for the Spelling Bee game.
// Wires up the pure reducer with useReducer and exposes a clean API to components.

"use client";

import { buildInitialState, gameReducer } from "./gameReducer";
import { clearPersistedState, loadPersistedState, usePersistence } from "./usePersistence";
import { useCallback, useEffect, useReducer } from "react";

import type { Puzzle } from "@/types";

/**
 * Central game hook — all components talk to this, never to the reducer directly.
 *
 * @param initialPuzzle - The puzzle to start with (loaded from data layer)
 */
export function useGameState(initialPuzzle: Puzzle) {
  // Always start from a clean state — avoids SSR/client hydration mismatch.
  // localStorage is only available in the browser, so we never read it during SSR.
  const [state, dispatch] = useReducer(
    gameReducer,
    initialPuzzle,
    buildInitialState
  );

  // After first client render, rehydrate from localStorage if a saved session exists.
  // useEffect only runs in the browser, never on the server.
  useEffect(() => {
    const saved = loadPersistedState(initialPuzzle);
    if (saved) {
      dispatch({ type: "RESTORE_STATE", saved });
    }
    // Only run once on mount — intentionally no deps on initialPuzzle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
