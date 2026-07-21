"use client";

// useTopothesiesRound — the round spine: reducer + persistence. Persists only
// { puzzleId, shapeGuesses, capitalGuesses } under the puzzle date; every stage
// flag is DERIVED by the reducer, so a refresh restores by replaying the saved
// guess histories through RESTORE_STATE (handoff 02/03). `maxKm` is injected via
// makeInitialTopothesiesState — never read from the live config, which the tests
// keep independent of the emitted dataset.

import { useCallback, useMemo, useReducer, useRef } from "react";

import { useRoundPersistence } from "@/hooks/useRoundPersistence";

import type {
  CapitalGuessRecord,
  ShapeGuessRecord,
  TopothesiesAnswer,
  TopothesiesState,
} from "../types";
import {
  makeInitialTopothesiesState,
  topothesiesReducer,
  type TopothesiesAction,
} from "../lib/topothesiesReducer";

interface RoundSnapshot {
  puzzleId:       string;
  shapeGuesses:   ShapeGuessRecord[];
  capitalGuesses: CapitalGuessRecord[];
}

interface TopothesiesRound {
  state:        TopothesiesState;
  dispatch:     (action: TopothesiesAction) => void;
  /** Whether the player has made a live (non-restored) action this session. */
  hasLiveActed: () => boolean;
}

export function useTopothesiesRound(
  target: TopothesiesAnswer,
  answers: TopothesiesAnswer[],
  maxKm: number,
  today: string,
): TopothesiesRound {
  const [state, rawDispatch] = useReducer(
    topothesiesReducer,
    undefined,
    () => makeInitialTopothesiesState(target, answers, maxKm),
  );

  // A guess dispatch is a live action; the internal RESTORE_STATE below goes
  // through rawDispatch, so a pure restore never flips the flag.
  const hasLiveActedRef = useRef(false);
  const dispatch = useCallback((action: TopothesiesAction) => {
    hasLiveActedRef.current = true;
    rawDispatch(action);
  }, []);
  const hasLiveActed = useCallback(() => hasLiveActedRef.current, []);

  const onRestore = useCallback((saved: RoundSnapshot) => {
    rawDispatch({
      type:           "RESTORE_STATE",
      shapeGuesses:   saved.shapeGuesses ?? [],
      capitalGuesses: saved.capitalGuesses ?? [],
    });
  }, []);

  const snapshot = useMemo<RoundSnapshot>(() => ({
    puzzleId:       state.puzzleId,
    shapeGuesses:   state.shapeGuesses,
    capitalGuesses: state.capitalGuesses,
  }), [state.puzzleId, state.shapeGuesses, state.capitalGuesses]);

  useRoundPersistence<RoundSnapshot>(
    "topothesies",
    today,
    snapshot,
    onRestore,
    // Never clobber a saved round with the pristine pre-hydration state.
    (snap) => snap.shapeGuesses.length > 0 || snap.capitalGuesses.length > 0,
  );

  return { state, dispatch, hasLiveActed };
}
