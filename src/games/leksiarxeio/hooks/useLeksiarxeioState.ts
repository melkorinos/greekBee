"use client";

// Leksiarxeio — React hook.
// Wires the reducer to persistence and exposes a clean API to the UI.

import type { GuessResult, LeksiarxeioPuzzle, LeksiarxeioStatus } from "../types";
import { leksiarxeioReducer, makeInitialLeksiarxeioState } from "./leksiarxeioReducer";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { buildLetterStateMap } from "../lib/letterState";
import { scoreLeksiarxeio } from "../lib/scoring";
import { useRoundPersistence } from "@/hooks/useRoundPersistence";

const MAX_GUESSES = 6;

// Fields persisted for a single Leksiarxeio session.
// The puzzle ID (e.g. "2026-05-22-wordle-5") already encodes date + length,
// so separate word-length sessions are stored as separate SessionStore entries.
interface LeksiarxeioRoundSnapshot {
  guesses: GuessResult[];
  status:  LeksiarxeioStatus;
}

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

  // ── Fire onGameEnd once when status transitions away from "playing" ──────────
  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (prevStatusRef.current === "playing" && state.status !== "playing") {
      onGameEnd?.(state.guesses.length, state.status === "won");
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.guesses.length, onGameEnd]);

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
    maxGuesses:   MAX_GUESSES,
    score,
    addLetter,
    deleteLetter,
    submitGuess,
    clearMessage,
  };
}
