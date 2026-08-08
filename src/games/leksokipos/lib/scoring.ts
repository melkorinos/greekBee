// Word scoring — pure function, mirrors the Leksokipos scoring rules.
// Scores are based on word length with a flat bonus for pangrams.

import type { LeksokiposPuzzle } from "../types";
import { isPangram } from "./pangram";
import { LEKSOKIPOS } from "@/config/gameRules";

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
  const bonus = isPangram(word, puzzle) ? LEKSOKIPOS.PANGRAM_BONUS : 0;
  return base + bonus;
}

/** Sums scores for a given word list against the same puzzle. Used by god-mode injection. */
export function computeScoreFromWords(words: string[], puzzle: LeksokiposPuzzle): number {
  return words.reduce((total, word) => total + scoreWord(word, puzzle), 0);
}

/**
 * Soft cap that turns a puzzle's scaled score into its rank-defining max.
 *
 * Below the knee the score passes through unchanged; above it the excess is
 * compressed logarithmically so the genius bar keeps rising with a puzzle's
 * richness (there is NO hard ceiling) while a word-dense garden never demands a
 * runaway total. The curve is slope-1 continuous at the knee, so there is no
 * visible kink between the pass-through and compressed regions.
 *
 * Knobs live in LEKSOKIPOS (SOFT_CAP_KNEE, SOFT_CAP_K) — see gameRules.ts.
 */
export function softCap(scaledScore: number): number {
  const { SOFT_CAP_KNEE: knee, SOFT_CAP_K: k } = LEKSOKIPOS;
  if (scaledScore <= knee) return scaledScore;
  return Math.round(knee + k * Math.log(1 + (scaledScore - knee) / k));
}

/**
 * Calculates the maximum achievable score for a puzzle
 * (sum of scores for every valid word).
 * Used to convert a raw score into a rank percentage.
 *
 * Two adjustments keep the ceiling player-friendly:
 *  1. Only 85% of the raw total counts — reaching every obscure word is not required.
 *  2. A soft cap (softCap) compresses very large totals so a puzzle's genius bar
 *     tracks its actual richness instead of pinning every rich day to one number.
 */
export function maxScore(puzzle: LeksokiposPuzzle): number {
  const raw = puzzle.validWords.reduce(
    (total, word) => total + scoreWord(word, puzzle),
    0
  );
  return softCap(Math.ceil(raw * LEKSOKIPOS.SCORE_SCALE));
}
