// scoring.ts — Topothesies score = shape points + capital bonus (pure).
// Points scale with the guesses REMAINING at the moment of the correct guess:
// solve on the first try → full points, each earlier wrong guess costs one
// step. A failed stage scores nothing for that stage, but the two stages are
// independent — a failed shape stage can still earn the capital bonus (the
// educational path: the unit is revealed, the capital is still worth guessing).
// All numeric knobs come from gameRules — never hardcoded here.

import { TOPOTHESIES } from "@/config/gameRules";

import type { TopothesiesState } from "../types";

/** Total score for a (typically finished) round. */
export function computeScore(state: TopothesiesState): number {
  let score = 0;

  if (state.shapeSolved) {
    const wrong = state.shapeGuesses.length - 1; // last guess was the correct one
    score += TOPOTHESIES.POINTS_PER_SHAPE_GUESS_LEFT * (TOPOTHESIES.SHAPE_GUESSES - wrong);
  }

  if (state.capitalSolved) {
    const wrong = state.capitalGuesses.length - 1;
    score += TOPOTHESIES.POINTS_PER_CAPITAL_GUESS_LEFT * (TOPOTHESIES.CAPITAL_GUESSES - wrong);
  }

  return score;
}
