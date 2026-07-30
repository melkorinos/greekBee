"use client";

// useLeksoplegmaRound — the round spine for Λεξόπλεγμα, as a thin adapter over the
// shared slot-fill spine (useSlotFillRound, ADR 0019). The spine owns the reducer
// → live-vs-restore → snapshot → persistence plumbing; this file supplies only
// what is leksoplegma-specific: its reducer/initial-state factory and the two pure
// mappings between state and the persisted snapshot.
//
// Leksoplegma's one genuine difference from the other slot-fill members is inside
// its reducer, not here: RESTORE_STATE filters every restored word against the
// CURRENT puzzle (a stale saved word from another board is dropped). `wrongTrace`
// is transient UI state — deliberately absent from the snapshot and reset on
// restore. No clock anywhere (points-only scoring); `status` is re-derived by the
// reducer, so the snapshot persists it only for the write-guard's convenience.

import { useCallback } from "react";

import { useSlotFillRound } from "@/hooks/useSlotFillRound";

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
  /** Whether the player has made a live (non-restored) action this session. */
  hasLiveActed: () => boolean;
}

export function useLeksoplegmaRound(puzzle: LeksoplegmaPuzzle, today: string): LeksoplegmaRound {
  // The reducer's initial-state factory takes the puzzle id first; `today` is that
  // id (the reducer only stores it as state.puzzleId). The spine passes the puzzle
  // OBJECT into makeInitialState, so we close over `today` for the id and take the
  // object as the parameter — matching the spine's makeInitialState(puzzle) shape.
  const makeInitialState = useCallback(
    (p: LeksoplegmaPuzzle) => makeInitialLeksoplegmaState(today, p),
    [today],
  );

  const makeRestoreAction = useCallback(
    (snap: RoundSnapshot): LeksoplegmaAction => ({
      type:          "RESTORE_STATE",
      foundRequired: snap.foundRequired,
      // Snapshots saved by the brief bonus-less build lack foundBonus.
      foundBonus:    snap.foundBonus ?? [],
      hintsUsed:     snap.hintsUsed,
    }),
    [],
  );

  return useSlotFillRound<LeksoplegmaState, LeksoplegmaAction, RoundSnapshot, LeksoplegmaPuzzle>({
    gameId:     "leksoplegma",
    sessionKey: today,
    puzzle,
    reducer:    leksoplegmaReducer,
    makeInitialState,
    toSnapshot: (state) => ({
      puzzleId:      state.puzzleId,
      foundRequired: state.foundRequired,
      foundBonus:    state.foundBonus,
      hintsUsed:     state.hintsUsed,
      status:        state.status,
    }),
    makeRestoreAction,
    // Never clobber a saved round with the pristine pre-hydration state.
    hasProgress: (snap) =>
      snap.foundRequired.length > 0 ||
      snap.foundBonus.length > 0 ||
      snap.hintsUsed.length > 0,
  });
}
