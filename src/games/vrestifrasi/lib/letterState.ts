// Vres Tin Frasi — letter state aggregation for keyboard colouring.
// Priority: correct > present > misplaced-word > absent > unknown.

import type { PhraseGuessResult, PhraseLetterState, PhraseLetterStateMap } from "../types";

const PRIORITY: PhraseLetterState[] = [
  "unknown",
  "absent",
  "misplaced-word",
  "present",
  "correct",
];

function priority(state: PhraseLetterState): number {
  return PRIORITY.indexOf(state);
}

/**
 * Builds a map of letter → best known PhraseLetterState from all submitted guesses.
 * "correct" always wins; "present" beats "misplaced-word" beats "absent".
 */
export function buildPhraseLetterStateMap(guesses: PhraseGuessResult[]): PhraseLetterStateMap {
  const map: PhraseLetterStateMap = {};

  for (const guess of guesses) {
    for (let wi = 0; wi < guess.words.length; wi++) {
      const word  = guess.words[wi];
      const tiles = guess.tiles[wi];
      for (let li = 0; li < word.length; li++) {
        const ch    = word[li];
        const state = tiles[li] as PhraseLetterState;
        const prev  = map[ch] ?? "unknown";
        if (priority(state) > priority(prev)) {
          map[ch] = state;
        }
      }
    }
  }

  return map;
}
