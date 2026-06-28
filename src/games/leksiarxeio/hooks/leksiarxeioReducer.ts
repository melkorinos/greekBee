// Leksiarxeio — pure reducer (no side effects, no React).
// All game state transitions live here.

import type { GuessResult, TileState, LeksiarxeioState } from "../types";

import { evaluateGuess } from "../lib/evaluateGuess";
import { LEKSIARXEIO } from "@/config/gameRules";

// ─── Action types ─────────────────────────────────────────────────────────────

export type LeksiarxeioAction =
  | { type: "ADD_LETTER";    letter: string }
  | { type: "DELETE_LETTER" }
  | { type: "SUBMIT_GUESS";  validWords: Set<string> }
  | { type: "NEW_GAME";      state: LeksiarxeioState }
  | { type: "RESTORE_STATE"; guesses: GuessResult[]; status: LeksiarxeioState["status"] }
  | { type: "CLEAR_MESSAGE" };

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function leksiarxeioReducer(state: LeksiarxeioState, action: LeksiarxeioAction): LeksiarxeioState {
  switch (action.type) {

    case "ADD_LETTER": {
      if (state.status !== "playing") return state;
      if (state.currentInput.length >= state.puzzle.length) {
        // Word is already at max length — give the player a visible signal
        // instead of silently dropping the keystroke.
        return { ...state, lastMessage: "Μέγιστο μήκος λέξης" };
      }
      return {
        ...state,
        currentInput: state.currentInput + action.letter,
        lastMessage: null,
      };
    }

    case "DELETE_LETTER": {
      if (state.status !== "playing") return state;
      if (state.currentInput.length === 0) return state;
      return {
        ...state,
        currentInput: state.currentInput.slice(0, -1),
        lastMessage: null,
      };
    }

    case "SUBMIT_GUESS": {
      if (state.status !== "playing") return state;

      const guess = state.currentInput;
      const { answer, length } = state.puzzle;

      // Validation
      if (guess.length < length) {
        return { ...state, lastMessage: "Πολύ λίγα γράμματα" };
      }
      if (!action.validWords.has(guess)) {
        return { ...state, lastMessage: "Δεν βρέθηκε στη λίστα" };
      }

      const tiles: TileState[] = evaluateGuess(guess, answer);
      const result: GuessResult = { word: guess, tiles };
      const newGuesses = [...state.guesses, result];

      const won  = guess === answer;
      const lost = !won && newGuesses.length >= LEKSIARXEIO.MAX_GUESSES;

      return {
        ...state,
        guesses: newGuesses,
        currentInput: "",
        status: won ? "won" : lost ? "lost" : "playing",
        lastMessage: won
          ? "Μπράβο! 🎉"
          : lost
            ? `Η λέξη ήταν: ${answer.toUpperCase()}`
            : null,
      };
    }

    case "NEW_GAME": {
      return action.state;
    }

    case "RESTORE_STATE": {
      return {
        ...state,
        guesses: action.guesses,
        currentInput: "",
        status: action.status,
        lastMessage: null,
      };
    }

    case "CLEAR_MESSAGE": {
      return { ...state, lastMessage: null };
    }

    default:
      return state;
  }
}

// ─── Initial state factory ────────────────────────────────────────────────────

export function makeInitialLeksiarxeioState(
  puzzle: LeksiarxeioState["puzzle"]
): LeksiarxeioState {
  return {
    puzzle,
    guesses: [],
    currentInput: "",
    status: "playing",
    lastMessage: null,
  };
}
