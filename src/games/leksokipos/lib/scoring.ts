// Word scoring — pure function, mirrors the Leksokipos scoring rules.
// Scores are based on word length with a flat bonus for pangrams.

import type { LeksokiposPuzzle } from "../types";
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
export function scoreWord(word: string, puzzle: LeksokiposPuzzle): number {
  const base = word.length === 4 ? 1 : word.length;
  const bonus = isPangram(word, puzzle) ? PANGRAM_BONUS : 0;
  return base + bonus;
}

/**
 * Calculates the maximum achievable score for a puzzle
 * (sum of scores for every valid word).
 * Used to convert a raw score into a rank percentage.
 *
 * Two adjustments keep the ceiling player-friendly:
 *  1. Only 80% of the raw total counts — reaching every obscure word is not required.
 *  2. Hard cap of 500 pts — prevents puzzles with very large word lists from
 *     producing leaderboard scores in the thousands.
 *
 * Tech debt: see .claude/issue-tracker/issues/04-td002-max-score-cap.md
 */
export const MAX_SCORE_CAP = 500;

export function maxScore(puzzle: LeksokiposPuzzle): number {
  const raw = puzzle.validWords.reduce(
    (total, word) => total + scoreWord(word, puzzle),
    0
  );
  return Math.min(Math.ceil(raw * 0.8), MAX_SCORE_CAP);
}
