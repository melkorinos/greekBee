"use client";

// Vres Tin Frasi — React hook.
// Wires the reducer to persistence and exposes a clean API to the UI.

import type { VresTinFrasiPuzzle, VresTinFrasiRoundSnapshot } from "../types";
import { vresTinFrasiReducer, makeInitialVresTinFrasiState } from "./vresTinFrasiReducer";
import { useCallback, useMemo, useReducer } from "react";

import { buildPhraseLetterStateMap } from "../lib/letterState";
import { scoreVresTinFrasi } from "../lib/scoring";
import { useRoundPersistence } from "@/hooks/useRoundPersistence";
import { useGameEndCallback } from "@/hooks/useGameEndCallback";
import { VRESTIFRASI } from "@/config/gameRules";

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
  submitGuess:  () => void;
  clearMessage: () => void;
}

export function useVresTinFrasiState(
  puzzle: VresTinFrasiPuzzle,
  validWords: string[],
  onGameEnd?: (attempts: number, won: boolean) => void,
): UseVresTinFrasiStateReturn {
  const validSet = useMemo(() => new Set(validWords), [validWords]);

  const [state, dispatch] = useReducer(
    vresTinFrasiReducer,
    puzzle,
    makeInitialVresTinFrasiState,
  );

  const snapshot = useMemo<VresTinFrasiRoundSnapshot>(() => ({
    guesses: state.guesses,
    status:  state.status,
  }), [state.guesses, state.status]);

  useRoundPersistence<VresTinFrasiRoundSnapshot>(
    "vrestifrasi",
    puzzle.id,
    snapshot,
    useCallback((saved) => dispatch({
      type:    "RESTORE_STATE",
      guesses: saved.guesses,
      status:  saved.status,
    }), []),
    useCallback((snap: VresTinFrasiRoundSnapshot) => snap.guesses.length > 0, []),
  );

  useGameEndCallback(state.status, state.guesses.length, onGameEnd);

  const letterStates = useMemo(
    () => buildPhraseLetterStateMap(state.guesses),
    [state.guesses],
  );

  const score = useMemo(
    () =>
      state.status !== "playing"
        ? scoreVresTinFrasi(state.guesses.length, state.status === "won")
        : 0,
    [state.guesses.length, state.status],
  );

  const addLetter    = useCallback((letter: string) => dispatch({ type: "ADD_LETTER", letter }), []);
  const deleteLetter = useCallback(() => dispatch({ type: "DELETE_LETTER" }), []);
  const clearWord    = useCallback(() => dispatch({ type: "CLEAR_WORD" }), []);
  const submitGuess  = useCallback(() => dispatch({ type: "SUBMIT_GUESS", validWords: validSet }), [validSet]);
  const clearMessage = useCallback(() => dispatch({ type: "CLEAR_MESSAGE" }), []);

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
    submitGuess,
    clearMessage,
  };
}
