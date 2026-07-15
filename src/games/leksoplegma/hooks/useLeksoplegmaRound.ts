"use client";

// useLeksoplegmaRound — the round spine: reducer + persistence. No clock
// anywhere (points-only scoring). Persists { puzzleId, foundRequired,
// foundBonus, hintsUsed, status } under the puzzle date so a refresh restores
// the dimmed board exactly (soft collapse is derived from foundRequired).

import { useCallback, useMemo, useReducer, useRef } from "react";

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
  foundBonus:    string[];
  hintsUsed:     string[];
  status:        "playing" | "finished";
}

interface LeksoplegmaRound {
  state:    LeksoplegmaState;
  dispatch: (action: LeksoplegmaAction) => void;
  /**
   * Whether the player has made a live (non-restored) action this session.
   * The spine owns the restore vs. live distinction — it issues RESTORE_STATE
   * itself — so score-posting eligibility no longer leaks into the Board.
   */
  hasLiveActed: () => boolean;
}

export function useLeksoplegmaRound(puzzle: LeksoplegmaPuzzle, today: string): LeksoplegmaRound {
  const [state, rawDispatch] = useReducer(
    leksoplegmaReducer,
    undefined,
    () => makeInitialLeksoplegmaState(today, puzzle),
  );

  // Any dispatch the Board issues (TRACE_WORD) is a live action; the internal
  // RESTORE_STATE below goes through rawDispatch, so a pure restore never flips.
  const hasLiveActedRef = useRef(false);
  const dispatch = useCallback((action: LeksoplegmaAction) => {
    hasLiveActedRef.current = true;
    rawDispatch(action);
  }, []);
  const hasLiveActed = useCallback(() => hasLiveActedRef.current, []);

  const onRestore = useCallback((saved: RoundSnapshot) => {
    rawDispatch({
      type:          "RESTORE_STATE",
      foundRequired: saved.foundRequired,
      // Snapshots saved by the brief bonus-less build lack foundBonus.
      foundBonus:    saved.foundBonus ?? [],
      hintsUsed:     saved.hintsUsed,
    });
  }, []);

  const snapshot = useMemo<RoundSnapshot>(() => ({
    puzzleId:      state.puzzleId,
    foundRequired: state.foundRequired,
    foundBonus:    state.foundBonus,
    hintsUsed:     state.hintsUsed,
    status:        state.status,
  }), [state.puzzleId, state.foundRequired, state.foundBonus, state.hintsUsed, state.status]);

  useRoundPersistence<RoundSnapshot>(
    "leksoplegma",
    today,
    snapshot,
    onRestore,
    // Never clobber a saved round with the pristine pre-hydration state.
    (snap) =>
      snap.foundRequired.length > 0 ||
      snap.foundBonus.length > 0 ||
      snap.hintsUsed.length > 0,
  );

  return { state, dispatch, hasLiveActed };
}
