// Vres Tin Frasi — pure reducer (no side effects, no React).
// Manages multi-word input with auto-advance when a word reaches its required length.

import type { PhraseGuessResult, VresTinFrasiState } from "../types";
import { evaluatePhraseGuess } from "../lib/evaluatePhraseGuess";
import { VRESTIFRASI } from "@/config/gameRules";

// ─── Action types ─────────────────────────────────────────────────────────────

export type VresTinFrasiAction =
  | { type: "ADD_LETTER";    letter: string }
  | { type: "DELETE_LETTER" }
  | { type: "CLEAR_WORD" }
  | { type: "SUBMIT_GUESS";  validWords: Set<string> }
  | { type: "RESTORE_STATE"; guesses: PhraseGuessResult[]; status: VresTinFrasiState["status"] }
  | { type: "CLEAR_MESSAGE" };

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function vresTinFrasiReducer(
  state: VresTinFrasiState,
  action: VresTinFrasiAction,
): VresTinFrasiState {
  switch (action.type) {

    case "ADD_LETTER": {
      if (state.status !== "playing") return state;

      const { currentWords, currentWordIndex, puzzle } = state;
      const maxLen = puzzle.wordLengths[currentWordIndex];

      if (currentWords[currentWordIndex].length >= maxLen) {
        // Current word is full — try to advance to next word
        const nextIdx = currentWordIndex + 1;
        if (nextIdx < puzzle.wordLengths.length) {
          // Advance cursor; add letter to next word if there's room
          const nextLen = puzzle.wordLengths[nextIdx];
          const nextWord = currentWords[nextIdx];
          if (nextWord.length < nextLen) {
            const newWords = [...currentWords];
            newWords[nextIdx] = nextWord + action.letter;
            return {
              ...state,
              currentWords: newWords,
              currentWordIndex: nextIdx,
              lastMessage: null,
            };
          }
        }
        return state; // all words full
      }

      const newWords = [...currentWords];
      newWords[currentWordIndex] = newWords[currentWordIndex] + action.letter;

      // Auto-advance cursor when this word becomes full
      let newWordIndex = currentWordIndex;
      if (newWords[currentWordIndex].length === maxLen) {
        const nextIdx = currentWordIndex + 1;
        if (nextIdx < puzzle.wordLengths.length) {
          newWordIndex = nextIdx;
        }
      }

      return {
        ...state,
        currentWords: newWords,
        currentWordIndex: newWordIndex,
        lastMessage: null,
      };
    }

    case "DELETE_LETTER": {
      if (state.status !== "playing") return state;
      const { currentWords, currentWordIndex } = state;
      const word = currentWords[currentWordIndex];
      if (word.length > 0) {
        const newWords = [...currentWords];
        newWords[currentWordIndex] = word.slice(0, -1);
        return { ...state, currentWords: newWords, lastMessage: null };
      }
      // Current word is empty — move back to previous word and delete its last letter
      if (currentWordIndex > 0) {
        const prevIdx  = currentWordIndex - 1;
        const prevWord = currentWords[prevIdx];
        if (prevWord.length > 0) {
          const newWords = [...currentWords];
          newWords[prevIdx] = prevWord.slice(0, -1);
          return { ...state, currentWords: newWords, currentWordIndex: prevIdx, lastMessage: null };
        }
      }
      return state;
    }

    case "CLEAR_WORD": {
      if (state.status !== "playing") return state;
      const newWords = [...state.currentWords];
      newWords[state.currentWordIndex] = "";
      return { ...state, currentWords: newWords, lastMessage: null };
    }

    case "SUBMIT_GUESS": {
      if (state.status !== "playing") return state;

      const { currentWords, puzzle } = state;

      // All words must be filled to the required length
      for (let i = 0; i < puzzle.wordLengths.length; i++) {
        if (currentWords[i].length < puzzle.wordLengths[i]) {
          return { ...state, lastMessage: "Συμπλήρωσε όλες τις λέξεις" };
        }
      }

      // Each word must be in the word pool (which now includes 2–3 letter words)
      for (let i = 0; i < currentWords.length; i++) {
        const word = currentWords[i];
        if (!action.validWords.has(word)) {
          return {
            ...state,
            currentWordIndex: i,
            lastMessage: `"${word.toUpperCase()}" δεν βρέθηκε στη λίστα`,
          };
        }
      }

      const tiles = evaluatePhraseGuess(currentWords, puzzle.normalizedWords);
      const result: PhraseGuessResult = { words: currentWords, tiles };
      const newGuesses = [...state.guesses, result];

      const won  = currentWords.every((w, i) => w === puzzle.normalizedWords[i]);
      const lost = !won && newGuesses.length >= VRESTIFRASI.MAX_GUESSES;

      return {
        ...state,
        guesses: newGuesses,
        currentWords: puzzle.wordLengths.map(() => ""),
        currentWordIndex: 0,
        status: won ? "won" : lost ? "lost" : "playing",
        lastMessage: won
          ? "Μπράβο! 🎉"
          : lost
            ? `Η φράση ήταν: ${puzzle.phrase}`
            : null,
      };
    }

    case "RESTORE_STATE": {
      return {
        ...state,
        guesses: action.guesses,
        currentWords: state.puzzle.wordLengths.map(() => ""),
        currentWordIndex: 0,
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

export function makeInitialVresTinFrasiState(
  puzzle: VresTinFrasiState["puzzle"],
): VresTinFrasiState {
  return {
    puzzle,
    guesses: [],
    currentWords: puzzle.wordLengths.map(() => ""),
    currentWordIndex: 0,
    status: "playing",
    lastMessage: null,
  };
}
