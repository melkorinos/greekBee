"use client";

// useGuessRound — shared wiring spine for the Wordle-family guess games
// (Leksiarxeio, Vres Tin Frasi). It owns the identical reducer → persistence →
// end-callback plumbing those games had copied verbatim. Each game keeps
// only what genuinely differs: its action wrappers, its keyboard letter-state
// map, and the fields it exposes to the UI.
//
// Every guess game persists the same { guesses, status } snapshot and restores it
// via a RESTORE_STATE action, so that contract lives here once. The action surface
// stays out of the spine — games own their own verbs.

import type { Dispatch } from "react";
import { useCallback, useMemo, useReducer } from "react";

import { useRoundPersistence } from "./useRoundPersistence";
import { useGameEndCallback } from "./useGameEndCallback";

import type { SliceId } from "@/types";

/** The minimal state shape the spine reads. Games add their own fields. */
export interface GuessRoundState<G> {
  guesses: G[];
  status:  "playing" | "won" | "lost";
}

/** The { guesses, status } snapshot persisted for every guess game. */
export interface GuessRoundSnapshot<G> {
  guesses: G[];
  status:  GuessRoundState<G>["status"];
}

export interface UseGuessRoundOptions<S extends GuessRoundState<G>, A, G, P> {
  /** Which game slice to persist under. */
  gameId:           SliceId;
  /** The puzzle the reducer initialises from. */
  puzzle:           P;
  /** Session key for persistence — the puzzle's id. */
  puzzleId:         string;
  reducer:          (state: S, action: A) => S;
  makeInitialState: (puzzle: P) => S;
  /** Builds the game's RESTORE_STATE action from a persisted snapshot. */
  makeRestoreAction: (snapshot: GuessRoundSnapshot<G>) => A;
  /** Called once when the game ends, with the attempts used. */
  onGameEnd?:       (attempts: number, won: boolean) => void;
}

export interface UseGuessRoundReturn<S, A> {
  state:    S;
  dispatch: Dispatch<A>;
}

export function useGuessRound<S extends GuessRoundState<G>, A, G, P>({
  gameId,
  puzzle,
  puzzleId,
  reducer,
  makeInitialState,
  makeRestoreAction,
  onGameEnd,
}: UseGuessRoundOptions<S, A, G, P>): UseGuessRoundReturn<S, A> {
  const [state, dispatch] = useReducer(reducer, puzzle, makeInitialState);

  // Persist only { guesses, status }: a new object reference appears only when
  // those change, so typing the current guess never triggers a write.
  const snapshot = useMemo<GuessRoundSnapshot<G>>(
    () => ({ guesses: state.guesses, status: state.status }),
    [state.guesses, state.status],
  );

  useRoundPersistence<GuessRoundSnapshot<G>>(
    gameId,
    puzzleId,
    snapshot,
    useCallback((saved) => dispatch(makeRestoreAction(saved)), [makeRestoreAction]),
    // Only persist once the player has made at least one guess.
    useCallback((snap: GuessRoundSnapshot<G>) => snap.guesses.length > 0, []),
  );

  useGameEndCallback(state.status, state.guesses.length, onGameEnd);

  return { state, dispatch };
}
