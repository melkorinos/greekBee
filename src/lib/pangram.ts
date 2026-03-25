// Pangram detection — a word is a pangram when it uses all 7 puzzle letters.
// Pangrams earn bonus points on top of the regular word score.

import type { Puzzle } from "@/types";
import { normalizeLetters } from "./normalize";

/**
 * Returns true when the word contains every letter in the puzzle
 * (center letter + all 6 outer letters).
 * Normalises both the word and puzzle letters before comparing so that
 * Greek final sigma (ς) is treated the same as regular sigma (σ).
 */
export function isPangram(word: string, puzzle: Puzzle): boolean {
  const normalizedWord = normalizeLetters(word);
  const allLetters = [puzzle.centerLetter, ...puzzle.outerLetters].map(normalizeLetters);
  return allLetters.every((letter) => normalizedWord.includes(letter));
}
