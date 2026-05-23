"use client";

// useLeksindeseisState — React hook managing Leksindeseis game state.
// Handles persistence via useRoundPersistence; never touches localStorage directly.

import type {
  LeksindeseisRoundSnapshot,
  LeksindeseisPuzzle,
  LeksindeseisState,
} from "../types";
import { useCallback, useMemo, useReducer, useState } from "react";

import { leksindeseisReducer } from "./leksindeseisReducer";
import { useRoundPersistence } from "@/hooks/useRoundPersistence";

const MAX_MISTAKES = 4;

function buildInitialState(puzzle: LeksindeseisPuzzle): LeksindeseisState {
  return {
    puzzle,
    solvedGroups:      [],
    currentSelection:  [],
    mistakesRemaining: MAX_MISTAKES,
    status:            "playing",
    lastFeedback:      null,
    guessHistory:      [],
  };
}

export function useLeksindeseisState(puzzle: LeksindeseisPuzzle) {
  const [state, dispatch] = useReducer(
    leksindeseisReducer,
    puzzle,
    buildInitialState,
  );

  // Memoize only the fields that need to be persisted.
  // puzzle.date is the session key, not part of the snapshot.
  const snapshot = useMemo<LeksindeseisRoundSnapshot>(() => ({
    solvedGroups:      state.solvedGroups,
    mistakesRemaining: state.mistakesRemaining,
    status:            state.status,
    guessHistory:      state.guessHistory,
  }), [state.solvedGroups, state.mistakesRemaining, state.status, state.guessHistory]);

  useRoundPersistence<LeksindeseisRoundSnapshot>(
    "leksindeseis",
    puzzle.date,
    snapshot,
    useCallback((saved) => dispatch({ type: "RESTORE_STATE", saved }), []),
  );

  // ── Display order of unsolved words (purely visual — not game state) ──────────
  // shuffleOrder tracks the user's preferred word order across all words (including solved).
  // displayOrder derives from it by filtering out solved words — no setState in effects.
  const allWords = useMemo(
    () => puzzle.groups.flatMap((g) => g.words),
    [puzzle],
  );
  const solvedWords = useMemo(
    () => new Set(state.solvedGroups.flatMap((g) => g.words)),
    [state.solvedGroups],
  );

  const [shuffleOrder, setShuffleOrder] = useState<string[]>(() => allWords);

  const displayOrder = useMemo(
    () => shuffleOrder.filter((w) => !solvedWords.has(w)),
    [shuffleOrder, solvedWords],
  );

  const shuffleWords = useCallback(() => {
    setShuffleOrder((prev) => {
      const a = [...prev];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    });
  }, []);

  const selectWord    = useCallback((word: string) => dispatch({ type: "SELECT_WORD", word }), []);
  const submitGuess   = useCallback(() => dispatch({ type: "SUBMIT_GUESS" }), []);
  const clearFeedback = useCallback(() => dispatch({ type: "CLEAR_FEEDBACK" }), []);

  return {
    ...state,
    displayOrder,
    selectWord,
    submitGuess,
    clearFeedback,
    shuffleWords,
  };
}
