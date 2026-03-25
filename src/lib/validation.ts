// Word validation logic — pure functions, no React, fully unit-testable.
// Every rule of the Spelling Bee game is enforced here.

import type { Puzzle, ValidationResult, ValidationStatus } from "@/types";

import { isPangram } from "./pangram";
import { normalizeLetters } from "./normalize";
import { scoreWord } from "./scoring";

/**
 * Validates a submitted word against the current puzzle rules.
 * Returns a ValidationResult describing the outcome and any points earned.
 */
export function validateWord(
  word: string,
  puzzle: Puzzle,
  foundWords: string[]
): ValidationResult {
  // Normalise: lowercase + convert Greek final sigma ς → σ
  const w = normalizeLetters(word);

  const status = getValidationStatus(w, puzzle, foundWords);
  const valid = status === "valid";

  return {
    status,
    // Only award points for a fresh valid word
    points: valid ? scoreWord(w, puzzle) : 0,
    isPangram: valid ? isPangram(w, puzzle) : false,
  };
}

/**
 * Runs each rule in order and returns the first failing status.
 * Returning early means we always give the most relevant error to the player.
 */
function getValidationStatus(
  word: string,
  puzzle: Puzzle,
  foundWords: string[]
): ValidationStatus {
  // Rule 1: minimum length of 4 letters
  if (word.length < 4) return "too_short";

  // Normalise puzzle letter set so ς and σ are treated as the same letter
  const allLetters = new Set(
    [puzzle.centerLetter, ...puzzle.outerLetters].map(normalizeLetters)
  );
  const centerLetter = normalizeLetters(puzzle.centerLetter);

  // Rule 2: every letter must be one of the 7 puzzle letters
  if (!Array.from(word).every((ch) => allLetters.has(ch))) return "invalid_letter";

  // Rule 3: word must contain the center letter
  if (!word.includes(centerLetter)) return "missing_center";

  // Rule 4: word must exist in the puzzle's accepted word list (normalised)
  const validSet = new Set(puzzle.validWords.map(normalizeLetters));
  if (!validSet.has(word)) return "not_in_list";

  // Rule 5: player hasn't already found this word
  if (foundWords.includes(word)) return "already_found";

  return "valid";
}
