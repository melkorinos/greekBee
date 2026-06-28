"use client";

// Leksiarxeio — React hook.
// Wires the reducer to persistence and exposes a clean API to the UI.

import type { LeksiarxeioPuzzle, LeksiarxeioRoundSnapshot } from "../types";
import { leksiarxeioReducer, makeInitialLeksiarxeioState } from "./leksiarxeioReducer";
import { useCallback, useMemo, useReducer } from "react";

import { buildLetterStateMap } from "../lib/letterState";
import { scoreLeksiarxeio } from "../lib/scoring";
import { useRoundPersistence } from "@/hooks/useRoundPersistence";
import { useGameEndCallback } from "@/hooks/useGameEndCallback";
import { LEKSIARXEIO } from "@/config/gameRules";

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
  score:        number;

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

  const [state, dispatch] = useReducer(
    leksiarxeioReducer,
    puzzle,
    makeInitialLeksiarxeioState
  );

  // Memoize only the fields that need to be persisted.
  // puzzle.id is not included — it's the session key, not part of the snapshot.
  const snapshot = useMemo<LeksiarxeioRoundSnapshot>(() => ({
    guesses: state.guesses,
    status:  state.status,
  }), [state.guesses, state.status]);

  useRoundPersistence<LeksiarxeioRoundSnapshot>(
    "leksiarxeio",
    puzzle.id,
    snapshot,
    useCallback((saved) => dispatch({
      type:    "RESTORE_STATE",
      guesses: saved.guesses,
      status:  saved.status,
    }), []),
    // Only persist once the player has made at least one guess
    useCallback((snap: LeksiarxeioRoundSnapshot) => snap.guesses.length > 0, []),
  );

  useGameEndCallback(state.status, state.guesses.length, onGameEnd);

  // ── Derived values ────────────────────────────────────────────────────────────
  const letterStates = useMemo(
    () => buildLetterStateMap(state.guesses),
    [state.guesses]
  );

  const score = useMemo(
    () =>
      state.status !== "playing"
        ? scoreLeksiarxeio(state.guesses.length, state.status === "won")
        : 0,
    [state.guesses.length, state.status]
  );

  // ── Actions ───────────────────────────────────────────────────────────────────
  const addLetter = useCallback(
    (letter: string) => dispatch({ type: "ADD_LETTER", letter }),
    []
  );
  const deleteLetter = useCallback(
    () => dispatch({ type: "DELETE_LETTER" }),
    []
  );
  const submitGuess = useCallback(
    () => dispatch({ type: "SUBMIT_GUESS", validWords: validSet }),
    [validSet]
  );
  const clearMessage = useCallback(
    () => dispatch({ type: "CLEAR_MESSAGE" }),
    []
  );

  return {
    guesses:      state.guesses,
    currentInput: state.currentInput,
    status:       state.status,
    lastMessage:  state.lastMessage,
    letterStates,
    maxGuesses:   LEKSIARXEIO.MAX_GUESSES,
    score,
    addLetter,
    deleteLetter,
    submitGuess,
    clearMessage,
  };
}
