// Leksoplegma scoring — points math per the grilled spec:
// total = Σ(required length × POINTS_PER_LETTER) + extras × BONUS_WORD_POINTS
//         − hints × HINT_COST_POINTS, floored at SCORE_FLOOR.
// is_perfect = zero hints (evaluated at completion, when all required are found).

import { describe, it, expect } from "vitest";

import { LEKSOPLEGMA } from "@/config/gameRules";
import { computeScore, isPerfectRound } from "@/games/leksoplegma/lib/scoring";

describe("LEKSOPLEGMA config", () => {
  it("holds the grilled constants", () => {
    expect(LEKSOPLEGMA.REQUIRED_WORDS).toBe(9);
    expect(LEKSOPLEGMA.GRID_SIZE).toBe(16);
    expect(LEKSOPLEGMA.POINTS_PER_LETTER).toBe(10);
    expect(LEKSOPLEGMA.BONUS_WORD_POINTS).toBe(25);
    expect(LEKSOPLEGMA.HINT_COST_POINTS).toBe(25);
    expect(LEKSOPLEGMA.MAX_HINTS_PER_WORD).toBe(1);
    expect(LEKSOPLEGMA.SCORE_FLOOR).toBe(0);
  });
});

describe("computeScore", () => {
  it("scores each required word at length × 10", () => {
    // 4 + 6 letters = 100 points — worked example from the handoff formula
    expect(computeScore(["λεξη", "γραμμα"], [], [])).toBe(100);
  });

  it("adds a flat 25 per extra word found", () => {
    expect(computeScore(["λεξη"], ["γομα", "μαγοσ"], [])).toBe(40 + 2 * 25);
  });

  it("extra words alone score without any required word", () => {
    expect(computeScore([], ["γομα"], [])).toBe(25);
  });

  it("subtracts 25 per hint used", () => {
    expect(computeScore(["λεξη", "γραμμα"], [], ["λεξη"])).toBe(100 - 25);
  });

  it("never goes below the floor of 0", () => {
    expect(computeScore([], [], ["α", "β", "γ"])).toBe(0);
  });

  it("is 0 when nothing was found", () => {
    expect(computeScore([], [], [])).toBe(0);
  });
});

describe("isPerfectRound", () => {
  it("is perfect with zero hints", () => {
    expect(isPerfectRound([])).toBe(true);
  });

  it("is not perfect once any hint was used", () => {
    expect(isPerfectRound(["λεξη"])).toBe(false);
  });
});
