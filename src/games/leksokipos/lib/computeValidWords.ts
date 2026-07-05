// computeValidWords — dynamically computes the valid word list for any 7-letter
// combination.  Used by the custom-URL route (/leksokipos/[center]/[outer])
// so that players can construct arbitrary puzzle URLs without operator pre-curation.
//
// Pure function: no React, no side-effects, fully unit-testable.
//
// ── Performance contract ──────────────────────────────────────────────────────
// Time complexity: O(n × L) where n = word-list length, L = max word length.
// For words-el.json (811 k words, avg ~6 chars): ~50–200 ms on production hardware.
//
// This function MUST remain O(n) — do not add nested loops or additional full
// list scans inside the filter.  A regression to O(n²) would multiply Vercel
// Fluid CPU billing by ~811 k/avg-result-count (~thousands×).
// The performance.test.ts "does not scale super-linearly" test guards this.
//
// The calling code (buildCustomPuzzle) wraps this in a module-level Map cache
// so production requests for the same letter combo pay the cost at most once
// per warm Fluid instance lifetime.

import { LEKSOKIPOS } from "@/config/gameRules";

import { normalizeLetters } from "./normalize";

/**
 * Returns every word from `wordList` that satisfies Leksokipos rules for the
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
        word.length >= LEKSOKIPOS.MIN_WORD_LENGTH &&
        word.includes(center) &&
        [...word].every((ch) => allowed.has(ch))
    );
}
