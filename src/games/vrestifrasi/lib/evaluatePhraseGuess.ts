// evaluatePhraseGuess — pure function, the core of Vres Tin Frasi.
// Given the answer phrase and a submitted guess phrase (both as arrays of
// normalized words), returns a PhraseTileState[][] — one array per word.
//
// Algorithm (two-pass, cross-word aware):
//   Pass 1: mark exact matches (correct) per word.
//           Build per-word frequency maps of UNMATCHED answer letters.
//   Pass 2: for each unmatched guess letter in word i:
//             - If it's in word i's remaining pool  → "present"  (yellow)
//             - Else if it's in any other word's pool → "misplaced-word" (purple)
//             - Else → "absent" (grey)
//           Each answer letter can only be consumed once across both passes.
//
// Preconditions (enforced by the reducer before calling):
//   - guessWords.length === answerWords.length
//   - guessWords[i].length === answerWords[i].length for all i
//   - All strings are already normalized (no accents, lowercase)

import type { PhraseTileState } from "../types";

/**
 * Evaluates a phrase guess against the answer.
 *
 * @param guessWords  - Normalized words submitted by the player.
 * @param answerWords - Normalized words of the answer phrase.
 * @returns           A 2D array: tiles[wordIndex][letterIndex].
 */
export function evaluatePhraseGuess(
  guessWords: string[],
  answerWords: string[],
): PhraseTileState[][] {
  const wordCount = answerWords.length;

  // result[i][j] starts as "absent"; pass 1 upgrades to "correct"
  const result: PhraseTileState[][] = answerWords.map((w) =>
    Array<PhraseTileState>(w.length).fill("absent")
  );

  // remaining[i] = frequency map of unmatched answer letters in word i after pass 1
  const remaining: Record<string, number>[] = Array.from({ length: wordCount }, () => ({}));

  // ── Pass 1: exact matches (correct) ──────────────────────────────────────────
  for (let i = 0; i < wordCount; i++) {
    for (let j = 0; j < answerWords[i].length; j++) {
      if (guessWords[i][j] === answerWords[i][j]) {
        result[i][j] = "correct";
      } else {
        const ch = answerWords[i][j];
        remaining[i][ch] = (remaining[i][ch] ?? 0) + 1;
      }
    }
  }

  // ── Pass 2: present / misplaced-word / absent ────────────────────────────────
  for (let i = 0; i < wordCount; i++) {
    for (let j = 0; j < answerWords[i].length; j++) {
      if (result[i][j] === "correct") continue;

      const ch = guessWords[i][j];
      if (!ch) continue;

      // Same-word pool first (yellow)
      if (remaining[i][ch] && remaining[i][ch] > 0) {
        result[i][j] = "present";
        remaining[i][ch]--;
        continue;
      }

      // Other words' pools (purple) — consume from the first word that has it
      let foundInOther = false;
      for (let k = 0; k < wordCount; k++) {
        if (k === i) continue;
        if (remaining[k][ch] && remaining[k][ch] > 0) {
          result[i][j] = "misplaced-word";
          remaining[k][ch]--;
          foundInOther = true;
          break;
        }
      }

      if (!foundInOther) {
        result[i][j] = "absent";
      }
    }
  }

  return result;
}
