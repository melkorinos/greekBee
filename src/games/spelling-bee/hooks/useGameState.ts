"use client";

// useGameState — the main React hook for the Spelling Bee game.
// Wires up the pure reducer with useReducer and exposes a clean API to components.

import { buildInitialState, gameReducer } from "./gameReducer";
import { migrateFromLegacyKeys, readSlice, writeSlice } from "@/hooks/useGameStore";
import { useCallback, useEffect, useMemo, useReducer } from "react";

import type { SpellingBeePuzzle } from "../types";
import { normalizeLetters } from "../lib/normalize";
import { useRoundPersistence } from "@/hooks/useRoundPersistence";

// Fields persisted for a single Spelling Bee round
interface SpellingBeeRoundSnapshot {
  foundWords:   string[];
  score:        number;
  currentRank:  string;
  startedAt:    number;
  givenUp:      boolean;
}

/**
 * Central game hook — all components talk to this, never to the reducer directly.
 *
 * @param initialPuzzle - The puzzle to start with (loaded from data layer)
 */
export function useGameState(initialPuzzle: SpellingBeePuzzle) {
  // Always start from clean state — avoids SSR/client hydration mismatch.
  const [state, dispatch] = useReducer(
    gameReducer,
    initialPuzzle,
    buildInitialState
  );

  // One-time migration: move very old "spelling-bee:state" key into the unified
  // envelope, then convert old flat snapshot format to the new SessionMap format.
  useEffect(() => {
    migrateFromLegacyKeys();

    // Old format was: { puzzleId, foundWords, ... } stored directly as the slice.
    // New format is:  { [puzzleId]: { foundWords, ... } } (SessionMap).
    const slice = readSlice<Record<string, unknown>>("spelling-bee");
    if (slice && typeof slice === "object" && "puzzleId" in slice) {
      const { puzzleId, ...rest } = slice as { puzzleId: string } & Record<string, unknown>;
      writeSlice("spelling-bee", { [puzzleId]: rest });
    }
  }, []);

  // Memoize only the fields that should be persisted.
  // useMemo creates a new object reference only when these fields change,
  // which is what triggers the save effect inside useRoundPersistence.
  const snapshot = useMemo<SpellingBeeRoundSnapshot>(() => ({
    foundWords:  state.foundWords,
    score:       state.score,
    currentRank: state.currentRank,
    startedAt:   state.startedAt,
    givenUp:     state.givenUp ?? false,
  }), [state.foundWords, state.score, state.currentRank, state.startedAt, state.givenUp]);

  const clearRound = useRoundPersistence<SpellingBeeRoundSnapshot>(
    "spelling-bee",
    initialPuzzle.id,
    snapshot,
    useCallback((saved) => dispatch({ type: "RESTORE_STATE", saved }), []),
  );

  // Pre-compute the allowed letter set once per puzzle.
  const allowedLetters = useMemo(
    () => new Set([state.puzzle.centerLetter, ...state.puzzle.outerLetters].map(normalizeLetters)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.puzzle.id]
  );

  // ── Dispatch helpers ──────────────────────────────────────────────────────────

  const addLetter = useCallback(
    (letter: string) => dispatch({ type: "ADD_LETTER", letter }),
    []
  );

  const deleteLetter = useCallback(
    () => dispatch({ type: "DELETE_LETTER" }),
    []
  );

  const clearInput = useCallback(
    () => dispatch({ type: "CLEAR_INPUT" }),
    []
  );

  const submitWord = useCallback(
    () => dispatch({ type: "SUBMIT_WORD" }),
    []
  );

  const shuffleLetters = useCallback(
    () => dispatch({ type: "SHUFFLE_LETTERS" }),
    []
  );

  const handleKeyboardLetter = useCallback(
    (rawKey: string) => {
      const letter = normalizeLetters(rawKey);
      if (allowedLetters.has(letter)) dispatch({ type: "ADD_LETTER", letter });
    },
    [allowedLetters]
  );

  const giveUp = useCallback(
    () => dispatch({ type: "GIVE_UP" }),
    []
  );

  const newGame = useCallback(
    (puzzle: SpellingBeePuzzle) => {
      clearRound();
      dispatch({ type: "NEW_GAME", puzzle });
    },
    [clearRound]
  );

  return {
    puzzle:          state.puzzle,
    currentInput:    state.currentInput,
    foundWords:      state.foundWords,
    score:           state.score,
    currentRank:     state.currentRank,
    puzzleMaxScore:  state.puzzleMaxScore,
    lastSubmission:  state.lastSubmission,
    givenUp:         state.givenUp ?? false,

    addLetter,
    deleteLetter,
    clearInput,
    submitWord,
    shuffleLetters,
    handleKeyboardLetter,
    newGame,
    giveUp,
  };
}
