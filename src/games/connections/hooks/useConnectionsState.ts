"use client";

// useConnectionsState — React hook managing Connections game state.
// Handles persistence via useGameStore; never touches localStorage directly.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type {
  ConnectionsPersistedState,
  ConnectionsPuzzle,
  ConnectionsState,
} from "../types";
import { readSlice, writeSlice } from "@/hooks/useGameStore";

import { connectionsReducer } from "./connectionsReducer";

const MAX_MISTAKES = 4;

function buildInitialState(
  puzzle: ConnectionsPuzzle,
  persisted: ConnectionsPersistedState | null,
): ConnectionsState {
  // If we have persisted state for today's puzzle, restore it
  if (persisted && persisted.date === puzzle.date) {
    return {
      puzzle,
      solvedGroups:      persisted.solvedGroups,
      currentSelection:  [],
      mistakesRemaining: persisted.mistakesRemaining,
      status:            persisted.status,
      lastFeedback:      null,
      guessHistory:      persisted.guessHistory,
    };
  }

  // Fresh state
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

export function useConnectionsState(puzzle: ConnectionsPuzzle) {
  const persisted = readSlice<ConnectionsPersistedState>("connections");

  const [state, dispatch] = useReducer(
    connectionsReducer,
    null,
    () => buildInitialState(puzzle, persisted),
  );

  // Shuffle display order of unsolved words (purely visual — not game state)
  const allWords = useMemo(
    () => puzzle.groups.flatMap((g) => g.words),
    [puzzle],
  );
  const solvedWords = useMemo(
    () => new Set(state.solvedGroups.flatMap((g) => g.words)),
    [state.solvedGroups],
  );
  const [displayOrder, setDisplayOrder] = useState<string[]>(() =>
    allWords.filter((w) => !solvedWords.has(w)),
  );

  // Keep display order in sync when groups are solved — derive synchronously,
  // not via an effect, to avoid the setState-in-effect lint error and cascading renders.
  const filteredOrder = useMemo(
    () => displayOrder.filter((w) => !solvedWords.has(w)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solvedWords],
  );
  // Only update state when the derived value actually changes length
  // (a group was just solved). Using a ref avoids an extra render cycle.
  const prevSolvedCountRef = useRef(state.solvedGroups.length);
  if (state.solvedGroups.length !== prevSolvedCountRef.current) {
    prevSolvedCountRef.current = state.solvedGroups.length;
    // Synchronous state update during render — safe because it's guarded by the condition
    setDisplayOrder(filteredOrder);
  }

  // Persist on every state change
  useEffect(() => {
    const toSave: ConnectionsPersistedState = {
      date:              puzzle.date,
      solvedGroups:      state.solvedGroups,
      mistakesRemaining: state.mistakesRemaining,
      status:            state.status,
      guessHistory:      state.guessHistory,
    };
    writeSlice("connections", toSave);
  }, [
    puzzle.date,
    state.solvedGroups,
    state.mistakesRemaining,
    state.status,
    state.guessHistory,
  ]);

  const selectWord    = useCallback((word: string) => dispatch({ type: "SELECT_WORD", word }), []);
  const submitGuess   = useCallback(() => dispatch({ type: "SUBMIT_GUESS" }), []);
  const clearFeedback = useCallback(() => dispatch({ type: "CLEAR_FEEDBACK" }), []);

  const shuffleWords = useCallback(() => {
    setDisplayOrder((prev) => {
      const a = [...prev];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    });
  }, []);

  return {
    ...state,
    displayOrder,
    selectWord,
    submitGuess,
    clearFeedback,
    shuffleWords,
  };
}
