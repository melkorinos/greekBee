// Leksiarxeio scoring — pure function, no React.

import { LEKSIARXEIO_SCORES } from "../types";

/**
 * Returns the score for a completed Leksiarxeio game.
 * @param guessCount - Number of guesses used (1–6)
 * @param won        - Whether the player guessed correctly
 */
export function scoreLeksiarxeio(guessCount: number, won: boolean): number {
  if (!won) return 0;
  return LEKSIARXEIO_SCORES[guessCount] ?? 0;
}
