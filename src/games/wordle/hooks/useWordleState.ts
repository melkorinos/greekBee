"use client";

// Wordle GR — React hook.
// Wires the reducer to persistence and exposes a clean API to the UI.

import type { GuessResult, WordlePuzzle, WordleStatus } from "../types";
import { makeInitialWordleState, wordleReducer } from "./wordleReducer";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { buildLetterStateMap } from "../lib/letterState";
import { scoreWordle } from "../lib/scoring";
import { useRoundPersistence } from "@/hooks/useRoundPersistence";

const MAX_GUESSES = 6;

// Fields persisted for a single Wordle session.
// The puzzle ID (e.g. "2026-05-22-wordle-5") already encodes date + length,
// so separate word-length sessions are stored as separate SessionStore entries.
interface WordleRoundSnapshot {
  guesses: GuessResult[];
  status:  WordleStatus;
}

/**
 * All state and actions the Wordle UI needs.
 * Words are kept as lower-case normalised strings; the UI uppercases for display.
 */
export interface UseWordleStateReturn {
  guesses:      ReturnType<typeof makeInitialWordleState>["guesses"];
  currentInput: string;
  status:       ReturnType<typeof makeInitialWordleState>["status"];
  lastMessage:  string | null;
  letterStates: ReturnType<typeof buildLetterStateMap>;
  maxGuesses:   number;
  score:        number;

  addLetter:    (letter: string) => void;
  deleteLetter: () => void;
  submitGuess:  () => void;
  clearMessage: () => void;
}

export function useWordleState(
  puzzle: WordlePuzzle,
  validWords: string[],
  /** Called when the game ends (won or lost) with the number of attempts used */
  onGameEnd?: (attempts: number, won: boolean) => void,
): UseWordleStateReturn {
  const validSet = useMemo(() => new Set(validWords), [validWords]);

  const [state, dispatch] = useReducer(
    wordleReducer,
    puzzle,
    makeInitialWordleState
  );

  // Memoize only the fields that need to be persisted.
  // puzzle.id is not included — it's the session key, not part of the snapshot.
  const snapshot = useMemo<WordleRoundSnapshot>(() => ({
    guesses: state.guesses,
    status:  state.status,
  }), [state.guesses, state.status]);

  useRoundPersistence<WordleRoundSnapshot>(
    "wordle",
    puzzle.id,
    snapshot,
    useCallback((saved) => dispatch({
      type:    "RESTORE_STATE",
      guesses: saved.guesses,
      status:  saved.status,
    }), []),
    // Only persist once the player has made at least one guess
    useCallback((snap: WordleRoundSnapshot) => snap.guesses.length > 0, []),
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
        ? scoreWordle(state.guesses.length, state.status === "won")
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
