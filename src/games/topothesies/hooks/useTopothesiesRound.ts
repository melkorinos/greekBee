"use client";

// useTopothesiesRound — thin adapter over the shared slot-fill spine
// (`useSlotFillRound`, ADR 0019). Persists only { puzzleId, shapeGuesses,
// capitalGuesses, gaveUp } under the puzzle date; every stage flag is DERIVED by
// the reducer, so a refresh restores by replaying the saved guess histories
// through RESTORE_STATE (handoff 02/03).
//
// This is the two-list member of the family: the initial state also needs the
// candidate answers and `maxKm`, which are injected via the factory below —
// never read from the live config, which the tests keep independent of the
// emitted dataset.

import { useCallback } from "react";

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
import { useSlotFillRound, type UseSlotFillRoundReturn } from "@/hooks/useSlotFillRound";

interface RoundSnapshot {
  puzzleId:       string;
  shapeGuesses:   ShapeGuessRecord[];
  capitalGuesses: CapitalGuessRecord[];
  gaveUp:         boolean;
}

const toSnapshot = (state: TopothesiesState): RoundSnapshot => ({
  puzzleId:       state.puzzleId,
  shapeGuesses:   state.shapeGuesses,
  capitalGuesses: state.capitalGuesses,
  gaveUp:         state.gaveUp,
});

const makeRestoreAction = (saved: RoundSnapshot): TopothesiesAction => ({
  type:           "RESTORE_STATE",
  shapeGuesses:   saved.shapeGuesses ?? [],
  capitalGuesses: saved.capitalGuesses ?? [],
  gaveUp:         saved.gaveUp ?? false,
});

// Never clobber a saved round with the pristine pre-hydration state.
const hasProgress = (snap: RoundSnapshot): boolean =>
  snap.shapeGuesses.length > 0 || snap.capitalGuesses.length > 0 || Boolean(snap.gaveUp);

export function useTopothesiesRound(
  target: TopothesiesAnswer,
  answers: TopothesiesAnswer[],
  maxKm: number,
  today: string,
): UseSlotFillRoundReturn<TopothesiesState, TopothesiesAction> {
  // The spine calls this once, lazily, on the initial render — `answers`/`maxKm`
  // are read at that moment and never re-read, matching the previous behaviour.
  const makeInitialState = useCallback(
    (puzzle: TopothesiesAnswer) => makeInitialTopothesiesState(puzzle, answers, maxKm),
    [answers, maxKm],
  );

  return useSlotFillRound({
    gameId:     "topothesies",
    sessionKey: today,
    puzzle:     target,
    reducer:    topothesiesReducer,
    makeInitialState,
    toSnapshot,
    makeRestoreAction,
    hasProgress,
  });
}
