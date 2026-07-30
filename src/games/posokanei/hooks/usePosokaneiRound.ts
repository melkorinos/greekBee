"use client";

// usePosokaneiRound — thin adapter over the shared slot-fill spine
// (`useSlotFillRound`, ADR 0019). Persists only { puzzleId, guesses, gaveUp }
// under the puzzle date; every stage flag is DERIVED by the reducer, so a refresh
// restores by replaying the saved history through RESTORE_STATE.

import type { PosokaneiGuessRecord, PosokaneiPuzzle, PosokaneiState } from "../types";
import {
  makeInitialPosokaneiState,
  posokaneiReducer,
  type PosokaneiAction,
} from "../lib/posokaneiReducer";
import { useSlotFillRound, type UseSlotFillRoundReturn } from "@/hooks/useSlotFillRound";

interface RoundSnapshot {
  puzzleId: string;
  guesses:  PosokaneiGuessRecord[];
  gaveUp:   boolean;
}

const toSnapshot = (state: PosokaneiState): RoundSnapshot => ({
  puzzleId: state.puzzleId,
  guesses:  state.guesses,
  gaveUp:   state.gaveUp,
});

const makeRestoreAction = (saved: RoundSnapshot): PosokaneiAction => ({
  type:    "RESTORE_STATE",
  guesses: saved.guesses ?? [],
  gaveUp:  saved.gaveUp ?? false,
});

// Never clobber a saved round with the pristine pre-hydration state.
const hasProgress = (snap: RoundSnapshot): boolean =>
  snap.guesses.length > 0 || Boolean(snap.gaveUp);

export function usePosokaneiRound(
  target: PosokaneiPuzzle,
  today: string,
): UseSlotFillRoundReturn<PosokaneiState, PosokaneiAction> {
  return useSlotFillRound({
    gameId:     "posokanei",
    sessionKey: today,
    puzzle:     target,
    reducer:    posokaneiReducer,
    makeInitialState: makeInitialPosokaneiState,
    toSnapshot,
    makeRestoreAction,
    hasProgress,
  });
}
