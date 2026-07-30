// blur.test.ts — blurRadiusForReveal: the mark de-blurs one ladder step per wrong
// guess, clamps at the ends, and a revealed round is fully clear.

import { describe, expect, it } from "vitest";

import { LOGOPAIGNIO } from "@/config/gameRules";
import { blurRadiusForReveal } from "@/games/logopaignio/lib/blur";

const LADDER = LOGOPAIGNIO.BLUR_STEP_RADII_PX;

describe("blurRadiusForReveal", () => {
  it("uses the first (hardest) radius before any wrong guess", () => {
    expect(blurRadiusForReveal(0, false)).toBe(LADDER[0]);
  });

  it("steps toward clearer one ladder entry per wrong guess", () => {
    for (let i = 0; i < LADDER.length; i++) {
      expect(blurRadiusForReveal(i, false)).toBe(LADDER[i]);
    }
  });

  it("is monotonically non-increasing (never blurs back up)", () => {
    for (let i = 1; i < LADDER.length; i++) {
      expect(blurRadiusForReveal(i, false)).toBeLessThanOrEqual(blurRadiusForReveal(i - 1, false));
    }
  });

  it("clamps past the end of the ladder to the clearest step", () => {
    expect(blurRadiusForReveal(LADDER.length, false)).toBe(LADDER[LADDER.length - 1]);
    expect(blurRadiusForReveal(LADDER.length + 5, false)).toBe(LADDER[LADDER.length - 1]);
  });

  it("clamps negative counts to the first radius", () => {
    expect(blurRadiusForReveal(-3, false)).toBe(LADDER[0]);
  });

  it("is fully clear (0) once the round is revealed, regardless of guesses", () => {
    expect(blurRadiusForReveal(0, true)).toBe(0);
    expect(blurRadiusForReveal(3, true)).toBe(0);
  });
});
