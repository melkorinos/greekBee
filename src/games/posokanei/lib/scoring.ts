// scoring.ts — Πόσο κάνει; score (pure). Points scale with the guesses REMAINING
// at the moment of the correct guess: solve on the first try → full points, each
// earlier wrong guess costs one step. A failed / given-up round scores nothing.
// All numeric knobs come from gameRules — never hardcoded here.

import { POSOKANEI } from "@/config/gameRules";

import type { PosokaneiState } from "../types";

/** Total score for a (typically finished) round. */
export function computeScore(state: PosokaneiState): number {
  if (!state.solved) return 0;
  const wrong = state.guesses.length - 1; // the last guess was the correct one
  return POSOKANEI.POINTS_PER_GUESS_LEFT * (POSOKANEI.MAX_GUESSES - wrong);
}
