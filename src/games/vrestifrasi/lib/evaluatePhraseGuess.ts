// evaluatePhraseGuess — pure function, the core of Vres Tin Frasi.
// Given the answer phrase and a submitted guess phrase (both as arrays of
// normalized words), returns a PhraseTileState[][] — one array per word.
//
// Algorithm (three-pass, cross-word aware):
//   Pass 1: mark exact matches (correct) per word.
//           Build per-word frequency maps of UNMATCHED answer letters.
//   Pass 2: every same-word claim, across ALL words — a guessed letter still in
//           its own word's pool is "present" (yellow).
//   Pass 3: every cross-word claim over what survives — a guessed letter in some
//           OTHER word's pool is "misplaced-word" (purple). Anything left is
//           "absent" (grey).
//   Each answer letter can only be consumed once across all three passes.
//
// Why passes 2 and 3 are separate sweeps rather than one per-word decision:
// ADR 0004 ranks yellow above purple because yellow names the word and purple
// only says "somewhere". That ranking has to be applied across the whole phrase,
// not per tile. Interleaved, word 0's purple claim could consume a letter that
// word 2 owned — word 2's own tile then went grey and word 0 showed a purple it
// had not earned. Splitting the sweeps makes word order stop deciding it.
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

  // ── Pass 2: same-word claims (present) — every word, before any cross-word claim ──
  // This pass must complete across ALL words before pass 3 starts. Running the two
  // claim kinds together per word let an early word's cross-word claim consume a
  // letter that a later word owned, so the later word's own tile fell through to
  // grey and the purple showed on a tile that had not earned it.
  for (let i = 0; i < wordCount; i++) {
    for (let j = 0; j < answerWords[i].length; j++) {
      if (result[i][j] === "correct") continue;

      const ch = guessWords[i][j];
      if (!ch) continue;

      if (remaining[i][ch] && remaining[i][ch] > 0) {
        result[i][j] = "present";
        remaining[i][ch]--;
      }
    }
  }

  // ── Pass 3: cross-word claims (misplaced-word) over whatever survives ────────
  for (let i = 0; i < wordCount; i++) {
    for (let j = 0; j < answerWords[i].length; j++) {
      // Only tiles still at their "absent" default are unclaimed.
      if (result[i][j] !== "absent") continue;

      const ch = guessWords[i][j];
      if (!ch) continue;

      // Consume from the first other word that still has it.
      for (let k = 0; k < wordCount; k++) {
        if (k === i) continue;
        if (remaining[k][ch] && remaining[k][ch] > 0) {
          result[i][j] = "misplaced-word";
          remaining[k][ch]--;
          break;
        }
      }
    }
  }

  return result;
}
