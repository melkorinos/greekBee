// Word validation logic — pure functions, no React, fully unit-testable.
// Every rule of the Leksokipos game is enforced here.

import type { LeksokiposPuzzle, ValidationResult, ValidationStatus } from "../types";
import { LEKSOKIPOS } from "@/config/gameRules";

import { isPangram } from "./pangram";
import { normalizeLetters } from "./normalize";
import { scoreWord } from "./scoring";

// ─── Puzzle index cache ───────────────────────────────────────────────────────
// Sets are built once per puzzle ID and reused across every validation call.
// This avoids re-allocating three Set objects on every keypress.

interface PuzzleIndex {
  allLetters:   Set<string>;
  centerLetter: string;
  validSet:     Set<string>;
}

const puzzleIndexCache = new Map<string, PuzzleIndex>();

function getPuzzleIndex(puzzle: LeksokiposPuzzle): PuzzleIndex {
  const cached = puzzleIndexCache.get(puzzle.id);
  if (cached) return cached;
  const index: PuzzleIndex = {
    allLetters:   new Set([puzzle.centerLetter, ...puzzle.outerLetters].map(normalizeLetters)),
    centerLetter: normalizeLetters(puzzle.centerLetter),
    validSet:     new Set(puzzle.validWords.map(normalizeLetters)),
  };
  puzzleIndexCache.set(puzzle.id, index);
  return index;
}

/**
 * Validates a submitted word against the current puzzle rules.
 * Returns a ValidationResult describing the outcome and any points earned.
 */
export function validateWord(
  word: string,
  puzzle: LeksokiposPuzzle,
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
  puzzle: LeksokiposPuzzle,
  foundWords: string[]
): ValidationStatus {
  // Rule 1: minimum word length
  if (word.length < LEKSOKIPOS.MIN_WORD_LENGTH) return "too_short";

  const { allLetters, centerLetter, validSet } = getPuzzleIndex(puzzle);

  // Rule 2: every letter must be one of the 7 puzzle letters
  if (!Array.from(word).every((ch) => allLetters.has(ch))) return "invalid_letter";

  // Rule 3: word must contain the center letter
  if (!word.includes(centerLetter)) return "missing_center";

  // Rule 4: word must exist in the puzzle's accepted word list (normalised)
  if (!validSet.has(word)) return "not_in_list";

  // Rule 5: player hasn't already found this word
  if (foundWords.includes(word)) return "already_found";

  return "valid";
}
