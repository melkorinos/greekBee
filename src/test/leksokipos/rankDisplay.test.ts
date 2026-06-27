// rankDisplay.test.ts — rankProgress(): progress maths + stale-rank safety.

import { describe, expect, it } from "vitest";

import { RANKS } from "@/games/leksokipos/lib/ranking";
import { rankProgress } from "@/components/leksokipos/rankDisplay";

describe("rankProgress", () => {
  it("returns the next rank and points-to-next at the lowest rank", () => {
    const { nextRank, ptsToNext } = rankProgress(0, 100, RANKS[0].name);
    expect(nextRank).toBe(RANKS[1].name);
    expect(ptsToNext).toBeGreaterThan(0);
  });

  it("has no next rank at the top", () => {
    const top = RANKS[RANKS.length - 1].name;
    const { nextRank, ptsToNext } = rankProgress(100, 100, top);
    expect(nextRank).toBeNull();
    expect(ptsToNext).toBeNull();
  });

  it("does NOT throw on a stale rank name not on the ladder (clamps to lowest)", () => {
    // Simulates a returning player whose localStorage holds a pre-rename rank.
    const stale = "Σπόρος" as unknown as (typeof RANKS)[number]["name"];
    expect(() => rankProgress(12, 100, stale)).not.toThrow();
    const { nextRank, ladder } = rankProgress(12, 100, stale);
    // Falls back to the lowest rank's progression; no row is marked active.
    expect(nextRank).toBe(RANKS[1].name);
    expect(ladder.some((r) => r.isActive)).toBe(false);
  });
});
