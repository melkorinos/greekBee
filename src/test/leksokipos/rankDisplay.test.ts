// rankDisplay.test.ts — rankProgress(): progress maths + stale-rank safety.
//                       getRankEmoji(): emoji lookup + unknown-name guard.

import { describe, expect, it } from "vitest";

import { RANKS, getRankEmoji } from "@/games/leksokipos/lib/ranking";
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

describe("getRankEmoji", () => {
  it("returns the correct emoji for a known rank", () => {
    expect(getRankEmoji("Ψαράκι")).toBe("🐟");
    expect(getRankEmoji("Απολυτότητα")).toBe("💯");
  });

  it("returns empty string for an unknown/stale rank name", () => {
    const stale = "Τζάμι" as unknown as (typeof RANKS)[number]["name"];
    expect(getRankEmoji(stale)).toBe("");
  });

  it("every rank on the ladder has a non-empty emoji", () => {
    for (const rank of RANKS) {
      expect(getRankEmoji(rank.name)).not.toBe("");
    }
  });
});
