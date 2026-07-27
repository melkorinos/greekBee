"use client";

// useSlotFillRound — shared wiring spine for the slot-fill family (Topothesies,
// Πόσο κάνει;, Λογοπαίγνιο). It owns the reducer → live-vs-restore → snapshot →
// persistence plumbing those games had copied verbatim. Each game keeps only what
// genuinely differs: its reducer, its initial-state factory, and the two pure
// mappings between its state and its persisted snapshot.
//
// The family's defining shape: every stage flag is DERIVED by the reducer from the
// guess history, so a refresh restores by replaying the saved history through a
// RESTORE_STATE action rather than by persisting the flags themselves.
//
// The contract worth stating once: `hasLiveActed`. The spine issues RESTORE_STATE
// itself through the raw dispatch, so a restored-but-untouched round never reports
// a live action — that is what stops useLiveScorePost from posting a score the
// player did not earn this session.
//
// The sibling spine for the Wordle family is `useGuessRound` (status playing/won/
// lost, no live-vs-restore distinction). Two families, two spines — see ADR 0019.

import { useCallback, useMemo, useReducer, useRef } from "react";

import { useRoundPersistence } from "./useRoundPersistence";

import type { SliceId } from "@/types";

export interface UseSlotFillRoundOptions<S, A, Snap, P> {
  /** Which game slice to persist under. */
  gameId:           SliceId;
  /** Session key for persistence — the puzzle date for every current member. */
  sessionKey:       string;
  /** The puzzle the reducer initialises from. */
  puzzle:           P;
  reducer:          (state: S, action: A) => S;
  makeInitialState: (puzzle: P) => S;
  /** Projects the persisted fields out of state. Must be a stable function. */
  toSnapshot:       (state: S) => Snap;
  /** Builds the game's RESTORE_STATE action from a persisted snapshot. */
  makeRestoreAction: (snapshot: Snap) => A;
  /**
   * True when a snapshot holds real progress. Guards the write so the pristine
   * pre-hydration state can never clobber a saved round.
   */
  hasProgress:      (snapshot: Snap) => boolean;
}

export interface UseSlotFillRoundReturn<S, A> {
  state:    S;
  dispatch: (action: A) => void;
  /** Whether the player has made a live (non-restored) action this session. */
  hasLiveActed: () => boolean;
}

export function useSlotFillRound<S, A, Snap, P>({
  gameId,
  sessionKey,
  puzzle,
  reducer,
  makeInitialState,
  toSnapshot,
  makeRestoreAction,
  hasProgress,
}: UseSlotFillRoundOptions<S, A, Snap, P>): UseSlotFillRoundReturn<S, A> {
  const [state, rawDispatch] = useReducer(reducer, puzzle, makeInitialState);

  // A guess/give-up dispatch is a live action; the internal RESTORE_STATE below
  // goes through rawDispatch, so a pure restore never flips the flag.
  const hasLiveActedRef = useRef(false);
  const dispatch = useCallback((action: A) => {
    hasLiveActedRef.current = true;
    rawDispatch(action);
  }, []);
  const hasLiveActed = useCallback(() => hasLiveActedRef.current, []);

  const onRestore = useCallback(
    (saved: Snap) => rawDispatch(makeRestoreAction(saved)),
    [makeRestoreAction],
  );

  // The snapshot reference must change only when a PERSISTED field changes —
  // useRoundPersistence writes on every new reference, so memoizing on `state`
  // itself would write on every dispatch (typing included). Projecting first and
  // keying the memo on the projected VALUES reproduces the per-field dep arrays
  // the games used to hand-maintain, without each game restating them.
  const projected = toSnapshot(state);
  const snapshot = useMemo(
    () => projected,
    // Snapshot fields are primitives or arrays the reducers replace by identity,
    // so value-wise deps are exactly right. The field count is fixed per game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Object.values(projected as Record<string, unknown>),
  );

  useRoundPersistence<Snap>(gameId, sessionKey, snapshot, onRestore, hasProgress);

  return { state, dispatch, hasLiveActed };
}
