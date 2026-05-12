// evaluateGuess — pure function, the core of Wordle GR.
// Given the secret answer and a submitted guess, returns a TileState for each position.
// No React, no side effects — fully unit-testable.
//
// Algorithm: two-pass approach to handle duplicate letters correctly.
//   Pass 1: mark exact matches (correct).
//   Pass 2: for remaining positions, mark present/absent using a frequency map
//           of unmatched answer letters so each answer letter is only counted once.

import type { TileState } from "../types";

/**
 * Evaluates a guess against the answer.
 * Both `guess` and `answer` must already be normalised (no accents, lowercase).
 *
 * @returns Array of TileState, one per letter position.
 */
export function evaluateGuess(guess: string, answer: string): TileState[] {
  const result: TileState[] = Array(answer.length).fill("absent");
  // Frequency map of answer letters not yet matched in pass 1
  const remaining: Record<string, number> = {};

  // ── Pass 1: exact matches ──────────────────────────────────────────────────
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
    } else {
      remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
    }
  }

  // ── Pass 2: present (wrong position) ──────────────────────────────────────
  for (let i = 0; i < answer.length; i++) {
    if (result[i] === "correct") continue; // already matched
    const ch = guess[i];
    if (ch && remaining[ch] && remaining[ch] > 0) {
      result[i] = "present";
      remaining[ch]--;
    }
  }

  return result;
}
