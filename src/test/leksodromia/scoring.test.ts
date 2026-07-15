// scoring.test.ts — unit tests for computeWordPoints (Leksodromia).
// Decay-to-floor: full BASE at t=0, linear decay to FLOOR at DECAY_SECONDS,
// never below the floor. Hints cost a fixed % of BASE. A solved word never
// scores below MIN_SOLVED_POINTS, so solving always beats skipping (0).
// Expected values are worked by hand from the handoff spec:
//   BASE {4:60, 5:80, 6:100, 7:120, 8:140} · floor 25% · decay 45 s · hint −30% BASE

import { describe, expect, it } from "vitest";

import { LEKSODROMIA } from "@/config/gameRules";
import { computeWordPoints } from "@/games/leksodromia/lib/scoring";

describe("computeWordPoints", () => {
  it("awards full BASE points for an instant solve", () => {
    expect(computeWordPoints(0, 4, 0)).toBe(60);
    expect(computeWordPoints(0, 8, 0)).toBe(140);
  });

  it("decays linearly — halfway through the decay window gives midpoint between BASE and floor", () => {
    // len 4: BASE 60, floor 15 → at 22.5 s: 60 − (45 × 0.5) = 37.5 → rounds to 38
    expect(computeWordPoints(22_500, 4, 0)).toBe(38);
    // len 6: BASE 100, floor 25 → at 30% of 45 s: 100 − (75 × 0.3) = 77.5 → 78
    expect(computeWordPoints(13_500, 6, 0)).toBe(78);
  });

  it("reaches the floor (25% of BASE) exactly at DECAY_SECONDS", () => {
    expect(computeWordPoints(45_000, 4, 0)).toBe(15);
    expect(computeWordPoints(45_000, 8, 0)).toBe(35);
  });

  it("never decays below the floor, however slow the solve", () => {
    expect(computeWordPoints(90_000, 4, 0)).toBe(15);
    expect(computeWordPoints(3_600_000, 8, 0)).toBe(35);
  });

  it("each hint costs 30% of BASE, off the decayed value", () => {
    expect(computeWordPoints(0, 4, 1)).toBe(42); // 60 − 18
    expect(computeWordPoints(0, 4, 2)).toBe(24); // 60 − 36
  });

  it("clamps to MIN_SOLVED_POINTS when hints push below it — a solve always beats a skip", () => {
    // floor 15 − 2 hints × 18 = −21 → clamped to 5
    expect(computeWordPoints(45_000, 4, 2)).toBe(5);
  });

  it("treats negative elapsed time as zero (clock can never award more than BASE)", () => {
    expect(computeWordPoints(-500, 5, 0)).toBe(80);
  });

  it("a perfect round (all 10 words instant, no hints) sums to MAX_SCORE", () => {
    const perfect = LEKSODROMIA.LENGTHS.reduce(
      (sum, len) => sum + LEKSODROMIA.WORDS_PER_LENGTH * computeWordPoints(0, len, 0),
      0,
    );
    expect(perfect).toBe(LEKSODROMIA.MAX_SCORE);
    expect(perfect).toBe(1000);
  });
});
