"use client";

// usePosokaneiRound — the round spine: reducer + persistence (mirrors
// useTopothesiesRound). Persists only { puzzleId, guesses, gaveUp } under the
// puzzle date; every stage flag is DERIVED by the reducer, so a refresh restores
// by replaying the saved history through RESTORE_STATE.

import { useCallback, useMemo, useReducer, useRef } from "react";

import { useRoundPersistence } from "@/hooks/useRoundPersistence";

import type { PosokaneiGuessRecord, PosokaneiPuzzle, PosokaneiState } from "../types";
import {
  makeInitialPosokaneiState,
  posokaneiReducer,
  type PosokaneiAction,
} from "../lib/posokaneiReducer";

interface RoundSnapshot {
  puzzleId: string;
  guesses:  PosokaneiGuessRecord[];
  gaveUp:   boolean;
}

interface PosokaneiRound {
  state:        PosokaneiState;
  dispatch:     (action: PosokaneiAction) => void;
  /** Whether the player has made a live (non-restored) action this session. */
  hasLiveActed: () => boolean;
}

export function usePosokaneiRound(target: PosokaneiPuzzle, today: string): PosokaneiRound {
  const [state, rawDispatch] = useReducer(
    posokaneiReducer,
    undefined,
    () => makeInitialPosokaneiState(target),
  );

  // A guess/give-up dispatch is a live action; the internal RESTORE_STATE below
  // goes through rawDispatch, so a pure restore never flips the flag.
  const hasLiveActedRef = useRef(false);
  const dispatch = useCallback((action: PosokaneiAction) => {
    hasLiveActedRef.current = true;
    rawDispatch(action);
  }, []);
  const hasLiveActed = useCallback(() => hasLiveActedRef.current, []);

  const onRestore = useCallback((saved: RoundSnapshot) => {
    rawDispatch({
      type:    "RESTORE_STATE",
      guesses: saved.guesses ?? [],
      gaveUp:  saved.gaveUp ?? false,
    });
  }, []);

  const snapshot = useMemo<RoundSnapshot>(() => ({
    puzzleId: state.puzzleId,
    guesses:  state.guesses,
    gaveUp:   state.gaveUp,
  }), [state.puzzleId, state.guesses, state.gaveUp]);

  useRoundPersistence<RoundSnapshot>(
    "posokanei",
    today,
    snapshot,
    onRestore,
    // Never clobber a saved round with the pristine pre-hydration state.
    (snap) => snap.guesses.length > 0 || Boolean(snap.gaveUp),
  );

  return { state, dispatch, hasLiveActed };
}
