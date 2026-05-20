"use client";

// Wordle GR — React hook.
// Wires the reducer to persistence and exposes a clean API to the UI.

import type { WordleLength, WordlePuzzle } from "../types";
import { makeInitialWordleState, wordleReducer } from "./wordleReducer";
import { readSlice, writeSlice } from "@/hooks/useGameStore";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import type { WordlePersistedSlice } from "../types";
import { buildLetterStateMap } from "../lib/letterState";
import { scoreWordle } from "../lib/scoring";

const MAX_GUESSES = 6;

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

  // ── Hydrate from persistence on mount / puzzle change ─────────────────────
  useEffect(() => {
    const slice = readSlice<WordlePersistedSlice>("wordle");
    const session = slice?.[puzzle.length as WordleLength];

    if (session && session.puzzleId === puzzle.id) {
      dispatch({
        type: "RESTORE_STATE",
        guesses: session.guesses,
        status:  session.status,
      });
    } else {
      // Different puzzle for this length — start fresh
      dispatch({ type: "NEW_GAME", state: makeInitialWordleState(puzzle) });
    }
  // Re-run when the active puzzle changes (length switch or new day)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  // ── Persist whenever guesses or status change ──────────────────────────────
  useEffect(() => {
    if (state.guesses.length === 0) return; // nothing to persist yet

    const existing = readSlice<WordlePersistedSlice>("wordle") ?? {};
    const updated: WordlePersistedSlice = {
      ...existing,
      [puzzle.length]: {
        puzzleId: puzzle.id,
        guesses:  state.guesses,
        status:   state.status,
      },
    };
    writeSlice("wordle", updated);
  }, [state.guesses, state.status, puzzle.id, puzzle.length]);

  // ── Fire onGameEnd once when status transitions away from "playing" ────────
  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (prevStatusRef.current === "playing" && state.status !== "playing") {
      onGameEnd?.(state.guesses.length, state.status === "won");
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.guesses.length, onGameEnd]);

  // ── Derived values ─────────────────────────────────────────────────────────
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

  // ── Actions ────────────────────────────────────────────────────────────────
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
