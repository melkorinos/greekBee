"use client";

// useLeksoplegmaRound — the round spine: reducer + persistence. No clock
// anywhere (points-only scoring). Persists { puzzleId, foundRequired,
// hintsUsed, status } under the puzzle date so a refresh restores the
// collapsed board exactly (collapse is derived from foundRequired).

import { useCallback, useMemo, useReducer } from "react";

import { useRoundPersistence } from "@/hooks/useRoundPersistence";

import type { LeksoplegmaPuzzle, LeksoplegmaState } from "../types";
import {
  leksoplegmaReducer,
  makeInitialLeksoplegmaState,
  type LeksoplegmaAction,
} from "../lib/leksoplegmaReducer";

interface RoundSnapshot {
  puzzleId:      string;
  foundRequired: string[];
  hintsUsed:     string[];
  status:        "playing" | "finished";
}

interface LeksoplegmaRound {
  state:    LeksoplegmaState;
  dispatch: (action: LeksoplegmaAction) => void;
}

export function useLeksoplegmaRound(puzzle: LeksoplegmaPuzzle, today: string): LeksoplegmaRound {
  const [state, dispatch] = useReducer(
    leksoplegmaReducer,
    undefined,
    () => makeInitialLeksoplegmaState(today, puzzle),
  );

  const onRestore = useCallback((saved: RoundSnapshot) => {
    dispatch({
      type:          "RESTORE_STATE",
      foundRequired: saved.foundRequired,
      hintsUsed:     saved.hintsUsed,
    });
  }, []);

  const snapshot = useMemo<RoundSnapshot>(() => ({
    puzzleId:      state.puzzleId,
    foundRequired: state.foundRequired,
    hintsUsed:     state.hintsUsed,
    status:        state.status,
  }), [state.puzzleId, state.foundRequired, state.hintsUsed, state.status]);

  useRoundPersistence<RoundSnapshot>(
    "leksoplegma",
    today,
    snapshot,
    onRestore,
    // Never clobber a saved round with the pristine pre-hydration state.
    (snap) =>
      snap.foundRequired.length > 0 ||
      snap.hintsUsed.length > 0,
  );

  return { state, dispatch };
}
