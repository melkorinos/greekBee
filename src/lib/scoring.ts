// Word scoring — pure function, mirrors the NYT Spelling Bee scoring rules.
// Scores are based on word length with a flat bonus for pangrams.

import type { Puzzle } from "@/types";
import { isPangram } from "./pangram";

/** Bonus points awarded on top of regular score for a pangram */
const PANGRAM_BONUS = 7;

/**
 * Calculates the points for a single valid word.
 *
 * Scoring rules:
 *  - 4-letter words  → 1 point (flat, regardless of length)
 *  - 5+ letter words → 1 point per letter
 *  - Pangrams        → above score + 7 bonus points
 */
export function scoreWord(word: string, puzzle: Puzzle): number {
  const base = word.length === 4 ? 1 : word.length;
  const bonus = isPangram(word, puzzle) ? PANGRAM_BONUS : 0;
  return base + bonus;
}

/**
 * Calculates the maximum achievable score for a puzzle
 * (sum of scores for every valid word).
 * Used to convert a raw score into a rank percentage.
 *
 * Capped at 80% of the raw total so rank thresholds feel reachable —
 * a player doesn't need to find every obscure word to reach the top rank.
 */
export function maxScore(puzzle: Puzzle): number {
  const raw = puzzle.validWords.reduce(
    (total, word) => total + scoreWord(word, puzzle),
    0
  );
  return Math.ceil(raw * 0.8);
}
