"use client";

// Vres Tin Frasi — React hook.
// Wires the reducer to persistence and exposes a clean API to the UI.

import type { PhraseGuessResult, VresTinFrasiPuzzle, VresTinFrasiState } from "../types";
import {
  vresTinFrasiReducer,
  makeInitialVresTinFrasiState,
  type VresTinFrasiAction,
} from "./vresTinFrasiReducer";
import { useCallback, useMemo } from "react";

import { buildPhraseLetterStateMap } from "../lib/letterState";
import { useGuessRound, type GuessRoundSnapshot } from "@/hooks/useGuessRound";
import { VRESTIFRASI } from "@/config/gameRules";

/** Build the reducer's RESTORE_STATE action from a persisted snapshot. */
const restoreVresTinFrasi = (
  snap: GuessRoundSnapshot<PhraseGuessResult>,
): VresTinFrasiAction => ({
  type:    "RESTORE_STATE",
  guesses: snap.guesses,
  status:  snap.status,
});

export interface UseVresTinFrasiStateReturn {
  guesses:          ReturnType<typeof makeInitialVresTinFrasiState>["guesses"];
  currentWords:     string[];
  currentWordIndex: number;
  status:           ReturnType<typeof makeInitialVresTinFrasiState>["status"];
  lastMessage:      string | null;
  letterStates:     ReturnType<typeof buildPhraseLetterStateMap>;
  maxGuesses:       number;

  addLetter:    (letter: string) => void;
  deleteLetter: () => void;
  clearWord:    () => void;
  submitGuess:  () => void;
  clearMessage: () => void;
}

// No `onGameEnd`: nothing happens at Round End beyond the Result Panel appearing.
// The Score submission this once fed is gone (ADR 0027), and unlike Λεξιαρχείο
// there is no second round to auto-advance to.
export function useVresTinFrasiState(
  puzzle: VresTinFrasiPuzzle,
  validWords: string[],
): UseVresTinFrasiStateReturn {
  const validSet = useMemo(() => new Set(validWords), [validWords]);

  const { state, dispatch } = useGuessRound<
    VresTinFrasiState,
    VresTinFrasiAction,
    PhraseGuessResult,
    VresTinFrasiPuzzle
  >({
    gameId:            "vrestifrasi",
    puzzle,
    puzzleId:          puzzle.id,
    reducer:           vresTinFrasiReducer,
    makeInitialState:  makeInitialVresTinFrasiState,
    makeRestoreAction: restoreVresTinFrasi,
  });

  const letterStates = useMemo(
    () => buildPhraseLetterStateMap(state.guesses),
    [state.guesses],
  );

  const addLetter    = useCallback((letter: string) => dispatch({ type: "ADD_LETTER", letter }), [dispatch]);
  const deleteLetter = useCallback(() => dispatch({ type: "DELETE_LETTER" }), [dispatch]);
  const clearWord    = useCallback(() => dispatch({ type: "CLEAR_WORD" }), [dispatch]);
  const submitGuess  = useCallback(() => dispatch({ type: "SUBMIT_GUESS", validWords: validSet }), [dispatch, validSet]);
  const clearMessage = useCallback(() => dispatch({ type: "CLEAR_MESSAGE" }), [dispatch]);

  return {
    guesses:          state.guesses,
    currentWords:     state.currentWords,
    currentWordIndex: state.currentWordIndex,
    status:           state.status,
    lastMessage:      state.lastMessage,
    letterStates,
    maxGuesses:       VRESTIFRASI.MAX_GUESSES,
    addLetter,
    deleteLetter,
    clearWord,
    submitGuess,
    clearMessage,
  };
}
