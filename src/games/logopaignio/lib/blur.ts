// blur.ts — pick the CSS blur radius (px) for the mark given how many wrong
// guesses have been made and whether the round has ended (solved/given-up →
// fully clear). Pure; the radii ladder is a data knob in gameRules
// (BLUR_STEP_RADII_PX), so difficulty tunes without a code change.
//
// Index = wrongGuesses so far (0 = the first, hardest look). Past the end of the
// ladder the mark stays at the clearest configured step — it never blurs back up
// and never goes negative. A revealed round is always 0 (fully clear).

import { LOGOPAIGNIO } from "@/config/gameRules";

/**
 * Blur radius in px for the mark. `wrongGuesses` de-blurs one step each; once the
 * round is `revealed` (solved or given up) the mark is fully clear (0).
 */
export function blurRadiusForReveal(wrongGuesses: number, revealed: boolean): number {
  if (revealed) return 0;
  const ladder = LOGOPAIGNIO.BLUR_STEP_RADII_PX;
  const i = Math.max(0, Math.min(wrongGuesses, ladder.length - 1));
  return ladder[i];
}
