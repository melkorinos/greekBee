import { describe, expect, it } from "vitest";

import { evaluatePriceGuess } from "@/games/posokanei/lib/evaluateGuess";

describe("evaluatePriceGuess", () => {
  it("is correct when the guess is within the band", () => {
    // price 2.00, band 0.10 → window [1.80, 2.20]
    expect(evaluatePriceGuess(2.1, 2.0, 0.1)).toMatchObject({ correct: true, direction: "correct" });
    expect(evaluatePriceGuess(1.8, 2.0, 0.1)).toMatchObject({ correct: true, direction: "correct" });
  });

  it("is correct exactly on the band edge (inclusive)", () => {
    expect(evaluatePriceGuess(2.2, 2.0, 0.1).correct).toBe(true);  // +10%
    expect(evaluatePriceGuess(2.201, 2.0, 0.1).correct).toBe(false);
  });

  it("says 'higher' when the guess is below the true price", () => {
    const r = evaluatePriceGuess(1.0, 2.0, 0.1);
    expect(r.correct).toBe(false);
    expect(r.direction).toBe("higher");
  });

  it("says 'lower' when the guess is above the true price", () => {
    const r = evaluatePriceGuess(3.0, 2.0, 0.1);
    expect(r.correct).toBe(false);
    expect(r.direction).toBe("lower");
  });

  it("reports 100% proximity for an exact guess", () => {
    expect(evaluatePriceGuess(2.0, 2.0, 0.1).proximityPct).toBe(100);
  });

  it("reports 0% proximity when the relative error hits the max", () => {
    // relErr = 1.0 (guess double the price) → 0% with PROXIMITY_MAX_REL = 1.0
    expect(evaluatePriceGuess(4.0, 2.0, 0.1).proximityPct).toBe(0);
  });

  it("clamps proximity to 0 for wildly wrong guesses", () => {
    expect(evaluatePriceGuess(100, 2.0, 0.1).proximityPct).toBe(0);
  });

  it("proximity decreases as the guess gets further away", () => {
    const near = evaluatePriceGuess(1.9, 2.0, 0.1).proximityPct;
    const far  = evaluatePriceGuess(1.2, 2.0, 0.1).proximityPct;
    expect(near).toBeGreaterThan(far);
  });
});
