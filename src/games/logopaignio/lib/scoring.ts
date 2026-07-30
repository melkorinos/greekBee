// scoring.ts — Λογοπαίγνιο score (pure). Clones the posokanei decay shape: points
// scale with the guesses REMAINING at the correct guess, so solving on the first
// (fully blurred) look → full points, each earlier wrong guess (one de-blur step)
// costs one step, and a failed / given-up round scores nothing. All numeric knobs
// come from gameRules — never hardcoded here.

import { LOGOPAIGNIO } from "@/config/gameRules";

import type { LogopaignioState } from "../types";

/** Total score for a (typically finished) round. */
export function computeScore(state: LogopaignioState): number {
  if (!state.solved) return 0;
  const wrong = state.guesses.length - 1; // the last guess was the correct one
  return LOGOPAIGNIO.POINTS_PER_GUESS_LEFT * (LOGOPAIGNIO.MAX_GUESSES - wrong);
}
