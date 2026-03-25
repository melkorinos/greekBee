// Pangram detection — a word is a pangram when it uses all 7 puzzle letters.
// Pangrams earn bonus points on top of the regular word score.

import type { Puzzle } from "@/types";

/**
 * Returns true when the word contains every letter in the puzzle
 * (center letter + all 6 outer letters).
 */
export function isPangram(word: string, puzzle: Puzzle): boolean {
  const allLetters = [puzzle.centerLetter, ...puzzle.outerLetters];
  return allLetters.every((letter) => word.includes(letter));
}
