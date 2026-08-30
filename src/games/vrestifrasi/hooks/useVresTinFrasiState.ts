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
import { scoreVresTinFrasi } from "../lib/scoring";
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
  score:            number;

  addLetter:    (letter: string) => void;
  deleteLetter: () => void;
  clearWord:    () => void;
  focusWord:    (wordIndex: number) => void;
  submitGuess:  () => void;
  clearMessage: () => void;
}

export function useVresTinFrasiState(
  puzzle: VresTinFrasiPuzzle,
  validWords: string[],
  onGameEnd?: (attempts: number, won: boolean) => void,
): UseVresTinFrasiStateReturn {
  const validSet = useMemo(() => new Set(validWords), [validWords]);

  const { state, dispatch, score } = useGuessRound<
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
    scoreFn:           scoreVresTinFrasi,
    onGameEnd,
  });

  const letterStates = useMemo(
    () => buildPhraseLetterStateMap(state.guesses),
    [state.guesses],
  );

  const addLetter    = useCallback((letter: string) => dispatch({ type: "ADD_LETTER", letter }), [dispatch]);
  const deleteLetter = useCallback(() => dispatch({ type: "DELETE_LETTER" }), [dispatch]);
  const clearWord    = useCallback(() => dispatch({ type: "CLEAR_WORD" }), [dispatch]);
  const focusWord    = useCallback((wordIndex: number) => dispatch({ type: "FOCUS_WORD", wordIndex }), [dispatch]);
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
    score,
    addLetter,
    deleteLetter,
    clearWord,
    focusWord,
    submitGuess,
    clearMessage,
  };
}
