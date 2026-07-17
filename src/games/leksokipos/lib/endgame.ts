// Endgame — what the player has left to hunt for.
//
// Endgame unlocks the moment the player reaches the top rank (Απολυτότητα) on a
// daily puzzle: the ScoreBar ladder flips to a remaining-words panel. That is the
// rank threshold (80% of maxScore), NOT a perfect score — reaching the top level
// is the reward, and the panel then reveals what's left.
//
// Word comparison is case-insensitive: found words are whatever the player typed,
// while the puzzle's validWords are canonical.

import type { LeksokiposPuzzle } from "../types";
import { isPangram } from "./pangram";

export interface EndgameInfo {
  remainingTotal:    number;
  remainingPangrams: number;
  /** Counts per word length, longest first. */
  byLength:          { length: number; count: number }[];
}

/** The puzzle's valid words that the player has not found yet. */
export function getRemainingWords(puzzle: LeksokiposPuzzle, foundWords: string[]): string[] {
  const found = new Set(foundWords.map((w) => w.toLowerCase()));
  return puzzle.validWords.filter((w) => !found.has(w.toLowerCase()));
}

/** Breakdown of the remaining words for the endgame panel. */
export function computeEndgameInfo(puzzle: LeksokiposPuzzle, remainingWords: string[]): EndgameInfo {
  const lengthMap = new Map<number, number>();
  for (const w of remainingWords) {
    lengthMap.set(w.length, (lengthMap.get(w.length) ?? 0) + 1);
  }

  return {
    remainingTotal:    remainingWords.length,
    remainingPangrams: remainingWords.filter((w) => isPangram(w, puzzle)).length,
    byLength:          Array.from(lengthMap.entries())
      .sort(([a], [b]) => b - a)
      .map(([length, count]) => ({ length, count })),
  };
}
