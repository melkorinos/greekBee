"use client";

// useLogopaignioRound — thin adapter over the shared slot-fill spine
// (`useSlotFillRound`, ADR 0019). Persists only { puzzleId, guesses, gaveUp }
// under the puzzle date; every stage flag is DERIVED by the reducer, so a refresh
// restores by replaying the saved history through RESTORE_STATE.

import type { LogopaignioGuessRecord, LogopaignioPuzzle, LogopaignioState } from "../types";
import {
  makeInitialLogopaignioState,
  logopaignioReducer,
  type LogopaignioAction,
} from "../lib/logopaignioReducer";
import { useSlotFillRound, type UseSlotFillRoundReturn } from "@/hooks/useSlotFillRound";

interface RoundSnapshot {
  puzzleId: string;
  guesses:  LogopaignioGuessRecord[];
  gaveUp:   boolean;
}

const toSnapshot = (state: LogopaignioState): RoundSnapshot => ({
  puzzleId: state.puzzleId,
  guesses:  state.guesses,
  gaveUp:   state.gaveUp,
});

const makeRestoreAction = (saved: RoundSnapshot): LogopaignioAction => ({
  type:    "RESTORE_STATE",
  guesses: saved.guesses ?? [],
  gaveUp:  saved.gaveUp ?? false,
});

// Never clobber a saved round with the pristine pre-hydration state.
const hasProgress = (snap: RoundSnapshot): boolean =>
  snap.guesses.length > 0 || Boolean(snap.gaveUp);

export function useLogopaignioRound(
  target: LogopaignioPuzzle,
  today: string,
): UseSlotFillRoundReturn<LogopaignioState, LogopaignioAction> {
  return useSlotFillRound({
    gameId:     "logopaignio",
    sessionKey: today,
    puzzle:     target,
    reducer:    logopaignioReducer,
    makeInitialState: makeInitialLogopaignioState,
    toSnapshot,
    makeRestoreAction,
    hasProgress,
  });
}
