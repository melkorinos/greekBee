"use client";

// Leksiarxeio — React hook.
// Wires the reducer to persistence and exposes a clean API to the UI.

import type { GuessResult, LeksiarxeioPuzzle, LeksiarxeioState } from "../types";
import {
  leksiarxeioReducer,
  makeInitialLeksiarxeioState,
  type LeksiarxeioAction,
} from "./leksiarxeioReducer";
import { useCallback, useMemo } from "react";

import { buildLetterStateMap } from "../lib/letterState";
import { useGuessRound, type GuessRoundSnapshot } from "@/hooks/useGuessRound";
import { LEKSIARXEIO } from "@/config/gameRules";

/** Build the reducer's RESTORE_STATE action from a persisted snapshot. */
const restoreLeksiarxeio = (
  snap: GuessRoundSnapshot<GuessResult>,
): LeksiarxeioAction => ({
  type:    "RESTORE_STATE",
  guesses: snap.guesses,
  status:  snap.status,
});

/**
 * All state and actions the Leksiarxeio UI needs.
 * Words are kept as lower-case normalised strings; the UI uppercases for display.
 */
export interface UseLeksiarxeioStateReturn {
  guesses:      ReturnType<typeof makeInitialLeksiarxeioState>["guesses"];
  currentInput: string;
  status:       ReturnType<typeof makeInitialLeksiarxeioState>["status"];
  lastMessage:  string | null;
  letterStates: ReturnType<typeof buildLetterStateMap>;
  maxGuesses:   number;

  addLetter:    (letter: string) => void;
  deleteLetter: () => void;
  submitGuess:  () => void;
  clearMessage: () => void;
}

export function useLeksiarxeioState(
  puzzle: LeksiarxeioPuzzle,
  validWords: string[],
  /** Called when the game ends (won or lost) with the number of attempts used */
  onGameEnd?: (attempts: number, won: boolean) => void,
): UseLeksiarxeioStateReturn {
  const validSet = useMemo(() => new Set(validWords), [validWords]);

  const { state, dispatch } = useGuessRound<
    LeksiarxeioState,
    LeksiarxeioAction,
    GuessResult,
    LeksiarxeioPuzzle
  >({
    gameId:            "leksiarxeio",
    puzzle,
    puzzleId:          puzzle.id,
    reducer:           leksiarxeioReducer,
    makeInitialState:  makeInitialLeksiarxeioState,
    makeRestoreAction: restoreLeksiarxeio,
    onGameEnd,
  });

  // ── Derived values ────────────────────────────────────────────────────────────
  const letterStates = useMemo(
    () => buildLetterStateMap(state.guesses),
    [state.guesses]
  );

  // ── Actions ───────────────────────────────────────────────────────────────────
  const addLetter = useCallback(
    (letter: string) => dispatch({ type: "ADD_LETTER", letter }),
    [dispatch]
  );
  const deleteLetter = useCallback(
    () => dispatch({ type: "DELETE_LETTER" }),
    [dispatch]
  );
  const submitGuess = useCallback(
    () => dispatch({ type: "SUBMIT_GUESS", validWords: validSet }),
    [dispatch, validSet]
  );
  const clearMessage = useCallback(
    () => dispatch({ type: "CLEAR_MESSAGE" }),
    [dispatch]
  );

  return {
    guesses:      state.guesses,
    currentInput: state.currentInput,
    status:       state.status,
    lastMessage:  state.lastMessage,
    letterStates,
    maxGuesses:   LEKSIARXEIO.MAX_GUESSES,
    addLetter,
    deleteLetter,
    submitGuess,
    clearMessage,
  };
}
