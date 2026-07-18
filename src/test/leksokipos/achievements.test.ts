// achievements.test.ts — the Leksokipos trophy catalog (display data only).
//
// This slice ships the frozen catalog, not the detection engine. The ids become
// player_achievements.achievement_id and FREEZE on first deploy, so the tests
// guard the ids and their uniqueness — renaming/removing an id after ship is a
// data-migration hazard, adding new tiers later is safe.

import { describe, expect, it } from "vitest";

import {
  LEKSOKIPOS_ACHIEVEMENTS,
  detectEarnedAchievements,
  detectEarnedPointsTiers,
  detectEarnedPangramTiers,
  nextPangramTierThreshold,
  describeAchievement,
  type AchievementContext,
} from "@/games/leksokipos/lib/achievements";

/** A neutral daily end-of-game snapshot; each test overrides only what it exercises. */
function makeCtx(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    isDaily:        true,
    foundWords:     ["γατα", "σπιτι"],
    validWordCount: 20,
    rank:           "Θηρίο",
    ...overrides,
  };
}

function ids() {
  return LEKSOKIPOS_ACHIEVEMENTS.map((a) => a.id);
}

describe("LEKSOKIPOS_ACHIEVEMENTS catalog", () => {
  it("contains the frozen one-shot badge ids", () => {
    expect(ids()).toEqual(
      expect.arrayContaining([
        "leksokipos-first-daily",
        "leksokipos-stin-korifi",
        "leksokipos-sidirodromos",
        "leksokipos-theristis",
      ]),
    );
  });

  it("gives each tiered badge three per-tier frozen ids with ascending thresholds", () => {
    const tiered = LEKSOKIPOS_ACHIEVEMENTS.filter((a) => a.kind === "tiered");
    expect(tiered.length).toBeGreaterThan(0);
    for (const badge of tiered) {
      const tiers = badge.tiers ?? [];
      expect(tiers.map((t) => t.id)).toEqual([
        `${badge.id}-chalkino`,
        `${badge.id}-asimenio`,
        `${badge.id}-chryso`,
      ]);
      const thresholds = tiers.map((t) => t.threshold);
      expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
    }
  });

  it("has globally unique award ids (entries and tiers)", () => {
    const all: string[] = [];
    for (const a of LEKSOKIPOS_ACHIEVEMENTS) {
      all.push(a.id);
      for (const t of a.tiers ?? []) all.push(t.id);
    }
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("detectEarnedAchievements — Σιδηρόδρομος (word ≥ 10 letters)", () => {
  it("earns when any found word has 10 or more letters", () => {
    const ctx = makeCtx({ foundWords: ["γατα", "παρακολουθηση"] }); // 13 letters
    expect(detectEarnedAchievements(ctx)).toContain("leksokipos-sidirodromos");
  });

  it("does not earn when every found word is shorter than 10 letters", () => {
    const ctx = makeCtx({ foundWords: ["γατα", "σπιτια", "καλημερα"] }); // ≤ 8 letters
    expect(detectEarnedAchievements(ctx)).not.toContain("leksokipos-sidirodromos");
  });
});

describe("detectEarnedAchievements — Θεριστής (≥ 80% of words found)", () => {
  it("earns at exactly 80% of the puzzle's words", () => {
    const ctx = makeCtx({
      foundWords:     Array.from({ length: 16 }, (_, i) => `word${i}`),
      validWordCount: 20, // 16 / 20 = 0.80
    });
    expect(detectEarnedAchievements(ctx)).toContain("leksokipos-theristis");
  });

  it("does not earn below 80%", () => {
    const ctx = makeCtx({
      foundWords:     Array.from({ length: 15 }, (_, i) => `word${i}`),
      validWordCount: 20, // 15 / 20 = 0.75
    });
    expect(detectEarnedAchievements(ctx)).not.toContain("leksokipos-theristis");
  });
});

describe("detectEarnedAchievements — Στην Κορυφή (top rank)", () => {
  it("earns when the player reaches the Απολυτότητα rank", () => {
    const ctx = makeCtx({ rank: "Απολυτότητα" });
    expect(detectEarnedAchievements(ctx)).toContain("leksokipos-stin-korifi");
  });

  it("does not earn at any rank below Απολυτότητα", () => {
    const ctx = makeCtx({ rank: "Γκουρού" });
    expect(detectEarnedAchievements(ctx)).not.toContain("leksokipos-stin-korifi");
  });
});

describe("detectEarnedAchievements — Πρώτα Βήματα (played a daily)", () => {
  it("earns once the player has found at least one word", () => {
    const ctx = makeCtx({ foundWords: ["γατα"] });
    expect(detectEarnedAchievements(ctx)).toContain("leksokipos-first-daily");
  });

  it("does not earn before any word is found", () => {
    const ctx = makeCtx({ foundWords: [] });
    expect(detectEarnedAchievements(ctx)).not.toContain("leksokipos-first-daily");
  });
});

describe("detectEarnedPointsTiers — Συλλέκτης Πόντων (lifetime leksokipos points)", () => {
  // Thresholds live in achievementTuning (chalkino 1000 / asimenio 10000 / chryso 25000).
  // The predicate returns every crossed tier id ascending; the server insert-if-absents
  // so returning already-earned tiers again is a harmless no-op.
  it("earns nothing below the first threshold", () => {
    expect(detectEarnedPointsTiers(999)).toEqual([]);
    expect(detectEarnedPointsTiers(0)).toEqual([]);
  });

  it("earns χάλκινο at exactly its threshold", () => {
    expect(detectEarnedPointsTiers(1000)).toEqual(["leksokipos-syllektis-ponton-chalkino"]);
  });

  it("earns every tier crossed, ascending", () => {
    expect(detectEarnedPointsTiers(10000)).toEqual([
      "leksokipos-syllektis-ponton-chalkino",
      "leksokipos-syllektis-ponton-asimenio",
    ]);
    expect(detectEarnedPointsTiers(25000)).toEqual([
      "leksokipos-syllektis-ponton-chalkino",
      "leksokipos-syllektis-ponton-asimenio",
      "leksokipos-syllektis-ponton-chryso",
    ]);
  });
});

describe("detectEarnedPangramTiers — Κυνηγός Πανγκράμ (lifetime pangram set size)", () => {
  // Thresholds live in achievementTuning (chalkino 10 / asimenio 20 / chryso 50).
  // The count is a COUNT(*) over player_pangrams, never a stored tally (ADR 0013 lane C).
  // Returns every crossed tier id ascending; the server insert-if-absents so re-returning
  // an earned tier is a harmless no-op.
  it("earns nothing below the first threshold", () => {
    expect(detectEarnedPangramTiers(9)).toEqual([]);
    expect(detectEarnedPangramTiers(0)).toEqual([]);
  });

  it("earns χάλκινο at exactly its threshold", () => {
    expect(detectEarnedPangramTiers(10)).toEqual(["leksokipos-kynigos-pangram-chalkino"]);
  });

  it("earns every tier crossed, ascending", () => {
    expect(detectEarnedPangramTiers(20)).toEqual([
      "leksokipos-kynigos-pangram-chalkino",
      "leksokipos-kynigos-pangram-asimenio",
    ]);
    expect(detectEarnedPangramTiers(50)).toEqual([
      "leksokipos-kynigos-pangram-chalkino",
      "leksokipos-kynigos-pangram-asimenio",
      "leksokipos-kynigos-pangram-chryso",
    ]);
  });
});

describe("nextPangramTierThreshold — Trophy Case 'X / N' denominator", () => {
  it("points at χάλκινο before any tier is crossed", () => {
    expect(nextPangramTierThreshold(0)).toBe(10);
    expect(nextPangramTierThreshold(9)).toBe(10);
  });

  it("advances to the next uncrossed threshold", () => {
    expect(nextPangramTierThreshold(10)).toBe(20);
    expect(nextPangramTierThreshold(20)).toBe(50);
  });

  it("is null once every tier is crossed", () => {
    expect(nextPangramTierThreshold(50)).toBeNull();
    expect(nextPangramTierThreshold(999)).toBeNull();
  });
});

describe("describeAchievement — earned-id → toast display", () => {
  it("resolves a one-shot id to its badge name, no tier label", () => {
    expect(describeAchievement("leksokipos-first-daily")).toEqual({ name: "Πρώτα Βήματα" });
  });

  it("resolves a tier id to the badge name plus the Greek tier label", () => {
    expect(describeAchievement("leksokipos-syllektis-ponton-asimenio")).toEqual({
      name: "Συλλέκτης Πόντων",
      tierLabel: "Ασημένιο",
    });
  });

  it("returns null for an unknown id", () => {
    expect(describeAchievement("leksokipos-nope")).toBeNull();
  });
});

describe("detectEarnedAchievements — daily gate", () => {
  it("earns nothing on a non-daily puzzle, even a flawless one", () => {
    const ctx = makeCtx({
      isDaily:        false,
      foundWords:     ["παρακολουθηση", ...Array.from({ length: 19 }, (_, i) => `word${i}`)],
      validWordCount: 20,
      rank:           "Απολυτότητα",
    });
    expect(detectEarnedAchievements(ctx)).toEqual([]);
  });
});
