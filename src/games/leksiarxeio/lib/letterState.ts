// Leksiarxeio — letter state aggregation for keyboard colouring.
// Derives the best known state for each letter from all submitted guesses.

import type { GuessResult, LetterState, LetterStateMap } from "../types";

/** Priority order — higher index wins when merging states */
const PRIORITY: LetterState[] = ["unknown", "absent", "present", "correct"];

function priority(state: LetterState): number {
  return PRIORITY.indexOf(state);
}

/**
 * Builds a map of letter → best known LetterState from all submitted guesses.
 * "correct" always beats "present" which always beats "absent".
 */
export function buildLetterStateMap(guesses: GuessResult[]): LetterStateMap {
  const map: LetterStateMap = {};

  for (const guess of guesses) {
    for (let i = 0; i < guess.word.length; i++) {
      const ch    = guess.word[i];
      const state = guess.tiles[i] as LetterState;
      const prev  = map[ch] ?? "unknown";
      if (priority(state) > priority(prev)) {
        map[ch] = state;
      }
    }
  }

  return map;
}
