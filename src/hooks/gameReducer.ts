// Pure reducer for the Spelling Bee game.
// No React imports — this file can be tested with plain Vitest unit tests.

import type { GameState, Puzzle } from "@/types";

import { calculateRank } from "@/lib/ranking";
import { maxScore } from "@/lib/scoring";
import { validateWord } from "@/lib/validation";

// ─── Action Types ─────────────────────────────────────────────────────────────

export type GameAction =
  | { type: "ADD_LETTER"; letter: string }   // Player taps/clicks a letter cell
  | { type: "DELETE_LETTER" }                // Player hits backspace
  | { type: "CLEAR_INPUT" }                  // Player clears the whole input
  | { type: "SUBMIT_WORD" }                  // Player hits Enter / Submit
  | { type: "SHUFFLE_LETTERS" }              // Randomise the outer ring display order
  | { type: "NEW_GAME"; puzzle: Puzzle }     // Load a fresh puzzle
  | { type: "RESTORE_STATE"; saved: Partial<GameState> }; // Rehydrate from localStorage (client-only)

// ─── Initial State Factory ────────────────────────────────────────────────────

/**
 * Builds a clean initial GameState from a puzzle.
 * Call this when the app first loads or when NEW_GAME is dispatched.
 */
export function buildInitialState(puzzle: Puzzle): GameState {
  return {
    puzzle,
    currentInput: "",
    foundWords: [],
    score: 0,
    currentRank: "Beginner",
    startedAt: Date.now(),
    lastSubmission: null,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

/**
 * Central game reducer.
 * Each case is a discrete game action — makes it straightforward to trace
 * exactly how state changes in response to player input.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ADD_LETTER": {
      // Append the tapped letter to the current input (letters can be reused)
      return {
        ...state,
        currentInput: state.currentInput + action.letter,
      };
    }

    case "DELETE_LETTER": {
      // Remove the last character from the input
      return {
        ...state,
        currentInput: state.currentInput.slice(0, -1),
      };
    }

    case "CLEAR_INPUT": {
      return { ...state, currentInput: "" };
    }

    case "SUBMIT_WORD": {
      const word = state.currentInput.toLowerCase();
      const result = validateWord(word, state.puzzle, state.foundWords);

      // Always clear input and record the submission for UI feedback
      const base = {
        ...state,
        currentInput: "",
        lastSubmission: { word, result },
      };

      if (result.status !== "valid") {
        // Word was rejected — state unchanged except cleared input + feedback
        return base;
      }

      // Word accepted — update found list, score and rank
      const newScore = state.score + result.points;
      const newRank = calculateRank(newScore, maxScore(state.puzzle));

      return {
        ...base,
        foundWords: [...state.foundWords, word],
        score: newScore,
        currentRank: newRank,
      };
    }

    case "SHUFFLE_LETTERS": {
      // Shuffle the outer letters array — purely cosmetic, changes honeycomb display order
      const shuffled = [...state.puzzle.outerLetters].sort(() => Math.random() - 0.5);
      return {
        ...state,
        puzzle: { ...state.puzzle, outerLetters: shuffled },
      };
    }

    case "NEW_GAME": {
      // Replace the entire state with a fresh session for the new puzzle
      return buildInitialState(action.puzzle);
    }

    case "RESTORE_STATE": {
      // Merge saved localStorage fields into current state.
      // Only called once after first client render to avoid hydration mismatch.
      return { ...state, ...action.saved };
    }

    default:
      return state;
  }
}
