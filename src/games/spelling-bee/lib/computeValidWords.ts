// computeValidWords — dynamically computes the valid word list for any 7-letter
// combination.  Used by the custom-URL route (/spelling-bee/[center]/[outer])
// so that players can construct arbitrary puzzle URLs without operator pre-curation.
//
// Pure function: no React, no side-effects, fully unit-testable.

import { normalizeLetters } from "./normalize";

/**
 * Returns every word from `wordList` that satisfies Spelling Bee rules for the
 * given letter set:
 *  - At least 4 letters long
 *  - Contains the center letter (after normalisation)
 *  - Every character is in the allowed set (center + outer, after normalisation)
 *
 * The returned words are already normalised (lowercase, no accents, ς→σ).
 */
export function computeValidWords(
  centerLetter: string,
  outerLetters: string[],
  wordList: string[]
): string[] {
  const center = normalizeLetters(centerLetter);
  const allowed = new Set([center, ...outerLetters.map(normalizeLetters)]);

  return wordList
    .map(normalizeLetters)
    .filter(
      (word) =>
        word.length >= 4 &&
        word.includes(center) &&
        [...word].every((ch) => allowed.has(ch))
    );
}
