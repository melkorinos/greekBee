// Wordle GR scoring — pure function, no React.

import { WORDLE_SCORES } from "../types";

/**
 * Returns the score for a completed Wordle game.
 * @param guessCount - Number of guesses used (1–6)
 * @param won        - Whether the player guessed correctly
 */
export function scoreWordle(guessCount: number, won: boolean): number {
  if (!won) return 0;
  return WORDLE_SCORES[guessCount] ?? 0;
}
