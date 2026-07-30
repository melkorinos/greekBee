// puzzleQuality.ts — the generation-time gates a Leksokipos letter set must clear
// before it is allowed to become a daily puzzle.
//
// These are AUTHORING rules, not gameplay rules: nothing here runs at play time,
// and none of it changes how an already-shipped puzzle scores. They exist because
// the rank ladder alone cannot fix two problems that are properties of the puzzle
// rather than of the formula:
//
//   1. Tedium — a 558-word garden is a slog at any threshold. No scoring knob
//      makes it short; only not shipping it does.
//   2. Pangram spam — a letter set permitting 110 pangrams is not a puzzle, it is
//      unbounded compounding. Aesthetic, and deliberately separate from (1):
//      19 boards in the pre-trim corpus failed ONLY this gate.
//
// Scoring is NEVER reimplemented here. Every point total comes from the real
// scoreWord()/softCap() in games/leksokipos/lib/scoring.ts, and the real
// isPangram() from games/leksokipos/lib/pangram.ts. A duplicated formula in this
// file is the most likely source of a silent drift bug — puzzleQuality.test.ts
// pins the parity.

import { LEKSOKIPOS } from "@/config/gameRules";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { isPangram } from "@/games/leksokipos/lib/pangram";
import { scoreWord, softCap } from "@/games/leksokipos/lib/scoring";
import { RANKS } from "@/games/leksokipos/lib/ranking";

/** The top rank's threshold — the "genius bar" every gate is measured against. */
const TOP_RANK_THRESHOLD = RANKS[RANKS.length - 1].threshold;

/** How many of a puzzle's valid words use all seven letters. */
export function countPangrams(puzzle: LeksokiposPuzzle): number {
  return puzzle.validWords.filter((word) => isPangram(word, puzzle)).length;
}

/** Raw points a player would hold after finding every valid word (pre-scale, pre-cap). */
export function totalPointsAvailable(puzzle: LeksokiposPuzzle): number {
  return puzzle.validWords.reduce((total, word) => total + scoreWord(word, puzzle), 0);
}

/** Points required for the top rank — mirrors maxScore() then applies the ladder. */
function geniusBar(puzzle: LeksokiposPuzzle): number {
  const scaled = softCap(Math.ceil(totalPointsAvailable(puzzle) * LEKSOKIPOS.SCORE_SCALE));
  return Math.ceil((scaled * TOP_RANK_THRESHOLD) / 100);
}

/**
 * A RELATIVE difficulty index: the genius bar divided by the puzzle's mean word
 * score. Read it as "how much of this garden the top rank costs", not as a
 * literal count of words a player will type.
 *
 * It models a player who finds words in random order, so their average find is
 * worth the puzzle's mean. Real players take the cheap short words first, so true
 * effort is HIGHER than this number — it is an optimistic lower bound, useful for
 * ranking puzzles against each other and for a corpus-wide ceiling. Never put it
 * in player-facing copy.
 *
 * Zero for an empty puzzle (no mean to divide by) rather than NaN, because the
 * generators call this on candidate sets before any other filtering.
 */
export function realisticWordsToGenius(puzzle: LeksokiposPuzzle): number {
  const wordCount = puzzle.validWords.length;
  if (wordCount === 0) return 0;

  const total = totalPointsAvailable(puzzle);
  if (total === 0) return 0;

  const meanWordScore = total / wordCount;
  return Math.ceil(geniusBar(puzzle) / meanWordScore);
}

/**
 * True when a puzzle clears both quality gates and may ship.
 *
 * Both bounds are exclusive (`<`), so MAX_PANGRAMS/MAX_WORDS_TO_GENIUS read as
 * "the first disallowed value" — the corpus guard test asserts the same way.
 */
export function meetsDifficultyRules(puzzle: LeksokiposPuzzle): boolean {
  return (
    countPangrams(puzzle) < LEKSOKIPOS.MAX_PANGRAMS &&
    realisticWordsToGenius(puzzle) < LEKSOKIPOS.MAX_WORDS_TO_GENIUS
  );
}
