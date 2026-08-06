// achievements.test.ts — the Leksokipos trophy catalog (display data only).
//
// This slice ships the frozen catalog, not the detection engine. The ids become
// player_achievements.achievement_id and FREEZE on first deploy, so the tests
// guard the ids and their uniqueness — renaming/removing an id after ship is a
// data-migration hazard, adding new tiers later is safe.

import { describe, expect, it } from "vitest";

import {
  LEKSOKIPOS_ACHIEVEMENTS,
  WORD_LENGTH_BADGES,
  SELECTABLE_BADGE_IDS,
  TIER_MEDALS,
  qualifyingEarnedIds,
  resolveDisplayBadge,
  detectEarnedAchievements,
  detectDayMilestones,
  detectEarnedPointsTiers,
  detectEarnedPangramTiers,
  nextPangramTierThreshold,
  describeAchievement,
  type AchievementContext,
} from "@/games/leksokipos/lib/achievements";
import { LEKSOKIPOS_ACHIEVEMENT_TUNING } from "@/config/achievementTuning";

/** The frozen id of the word-length badge for an exact length (test helper). */
function lengthBadgeId(length: number): string {
  const badge = WORD_LENGTH_BADGES.find((b) => b.length === length);
  if (!badge) throw new Error(`no word-length badge for length ${length}`);
  return badge.id;
}

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
  it("contains the frozen top-level badge ids", () => {
    expect(ids()).toEqual(
      expect.arrayContaining([
        "leksokipos-first-daily",
        "leksokipos-stin-korifi",
        "leksokipos-theristis",
        "leksokipos-makrylexis",
      ]),
    );
  });

  it("keeps the frozen word-length ids as the ladder's tier ids", () => {
    // The four lengths were shipped as separate one-shots and their ids are frozen
    // in player_achievements. Grouping them under Μακρυλέξης must not rename them.
    const ladder = LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === "leksokipos-makrylexis");
    expect(ladder?.tiers?.map((t) => t.id)).toEqual([
      "leksokipos-sidirodromos",
      "leksokipos-word-11",
      "leksokipos-word-12",
      "leksokipos-word-13",
    ]);
  });

  it("gives each cumulative tiered badge three per-tier frozen ids with ascending thresholds", () => {
    // The word-length ladder is excluded: its tier ids are the pre-existing frozen
    // one-shot ids, not `${base}-${tier}`, and it has a fourth rung above gold.
    const tiered = LEKSOKIPOS_ACHIEVEMENTS.filter(
      (a) => a.kind === "tiered" && a.id !== "leksokipos-makrylexis",
    );
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

  it("orders the ladder's rungs by ascending word length", () => {
    const ladder = LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === "leksokipos-makrylexis");
    const thresholds = (ladder?.tiers ?? []).map((t) => t.threshold);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
  });

  it("has globally unique award ids (entries and tiers)", () => {
    const all: string[] = [];
    for (const a of LEKSOKIPOS_ACHIEVEMENTS) {
      all.push(a.id);
      for (const t of a.tiers ?? []) all.push(t.id);
    }
    expect(new Set(all).size).toBe(all.length);
  });

  it("gives every entry a non-empty glyph", () => {
    for (const a of LEKSOKIPOS_ACHIEVEMENTS) {
      expect(a.glyph).toBeTruthy();
    }
  });

  it("assigns the operator-approved glyph to each badge", () => {
    // Glyphs are display copy the operator signed off on — a silent change should fail.
    const glyphByName = Object.fromEntries(
      LEKSOKIPOS_ACHIEVEMENTS.map((a) => [a.name, a.glyph]),
    );
    expect(glyphByName).toMatchObject({
      "Πρώτα Βήματα":     "🌱",
      "Στην Κορυφή":      "👑",
      "Θεριστής":        "🌾",
      "Μακρυλέξης":      "🛏️", // the ladder wears its top rung's glyph
      "Κυνηγός Πανγκράμ": "✍️",
      "Συλλέκτης Πόντων": "💎",
    });
  });

  it("keeps the operator-approved per-length glyphs on the ladder's rungs", () => {
    expect(
      Object.fromEntries(WORD_LENGTH_BADGES.map((b) => [b.length, b.glyph])),
    ).toMatchObject({ 10: "🚂", 11: "🚄", 12: "🚛", 13: "🛏️" });
  });
});

describe("detectEarnedAchievements — word-length ladder (EXACT length one-shots)", () => {
  // Σιδηρόδρομος = a word of exactly 10 letters; the 11/12/13 badges extend the
  // ladder. Detection is exact (===), never ≥ — a 13-letter find earns only the 13
  // badge, so each length is its own accomplishment.
  it("earns Σιδηρόδρομος on a word of exactly 10 letters", () => {
    const ctx = makeCtx({ foundWords: ["γατα", "α".repeat(10)] });
    expect(detectEarnedAchievements(ctx)).toContain("leksokipos-sidirodromos");
  });

  it("earns the 11 / 12 / 13 badge each on a word of exactly that length", () => {
    for (const length of [11, 12, 13]) {
      const ctx = makeCtx({ foundWords: ["α".repeat(length)] });
      expect(detectEarnedAchievements(ctx)).toContain(lengthBadgeId(length));
    }
  });

  it("a longer word does NOT earn a shorter length's badge (exact, not ≥)", () => {
    const earned = detectEarnedAchievements(makeCtx({ foundWords: ["α".repeat(13)] }));
    expect(earned).toContain(lengthBadgeId(13));
    expect(earned).not.toContain("leksokipos-sidirodromos");
    expect(earned).not.toContain(lengthBadgeId(11));
    expect(earned).not.toContain(lengthBadgeId(12));
  });

  it("earns nothing in the ladder when every found word is under 10 letters", () => {
    const ctx = makeCtx({ foundWords: ["γατα", "σπιτια", "καλημερα"] }); // ≤ 8 letters
    const earned = detectEarnedAchievements(ctx);
    for (const { id } of WORD_LENGTH_BADGES) expect(earned).not.toContain(id);
  });

  it("a word longer than the ladder top (14+) earns no length badge", () => {
    const earned = detectEarnedAchievements(makeCtx({ foundWords: ["α".repeat(14)] }));
    for (const { id } of WORD_LENGTH_BADGES) expect(earned).not.toContain(id);
  });
});

describe("WORD_LENGTH_BADGES — the exact-length ladder", () => {
  it("covers exactly the lengths configured in achievementTuning", () => {
    expect(WORD_LENGTH_BADGES.map((b) => b.length)).toEqual(
      LEKSOKIPOS_ACHIEVEMENT_TUNING.wordLengthBadges,
    );
  });

  it("maps length 10 to the frozen Σιδηρόδρομος id", () => {
    expect(lengthBadgeId(10)).toBe("leksokipos-sidirodromos");
  });
});

describe("detectEarnedAchievements — Θεριστής (≥ 80% of words found)", () => {
  it("earns at exactly 70% of the puzzle's words", () => {
    const ctx = makeCtx({
      foundWords:     Array.from({ length: 14 }, (_, i) => `word${i}`),
      validWordCount: 20, // 14 / 20 = 0.70
    });
    expect(detectEarnedAchievements(ctx)).toContain("leksokipos-theristis");
  });

  it("does not earn below 70%", () => {
    const ctx = makeCtx({
      foundWords:     Array.from({ length: 13 }, (_, i) => `word${i}`),
      validWordCount: 20, // 13 / 20 = 0.65
    });
    expect(detectEarnedAchievements(ctx)).not.toContain("leksokipos-theristis");
  });
});

// ── Day milestones (player_milestones counters) ───────────────────────────────
//
// The two lifetime day-counters the rebuilt catalog tiers on. Detection is pure and
// lives beside the one-shots; the sync lane owns posting them. A milestone is
// recorded for the DAY, so the qualifying condition is all that matters here.

describe("detectDayMilestones", () => {
  const kinds = (ctx: AchievementContext) => detectDayMilestones(ctx).map((m) => m.kind);

  it("records top_rank on reaching the top of the ladder", () => {
    expect(kinds(makeCtx({ rank: "Απολυτότητα" }))).toContain("top_rank");
  });

  it("does not record top_rank below the top rank", () => {
    expect(kinds(makeCtx({ rank: "Θηρίο" }))).not.toContain("top_rank");
  });

  it("records tzimani at the configured found-word ratio", () => {
    const ctx = makeCtx({
      foundWords:     Array.from({ length: 14 }, (_, i) => `word${i}`),
      validWordCount: 20, // 14 / 20 = 0.70
    });
    expect(kinds(ctx)).toContain("tzimani");
  });

  it("does not record tzimani below the ratio", () => {
    const ctx = makeCtx({
      foundWords:     Array.from({ length: 13 }, (_, i) => `word${i}`),
      validWordCount: 20, // 0.65
    });
    expect(kinds(ctx)).not.toContain("tzimani");
  });

  it("carries the achieved percentage so the ratio can be re-tuned from real data", () => {
    const ctx = makeCtx({
      foundWords:     Array.from({ length: 18 }, (_, i) => `word${i}`),
      validWordCount: 20, // 90%
    });
    expect(detectDayMilestones(ctx)).toContainEqual({ kind: "tzimani", value: 90 });
  });

  it("gives top_rank no value — a day either reached it or did not", () => {
    expect(detectDayMilestones(makeCtx({ rank: "Απολυτότητα" })))
      .toContainEqual({ kind: "top_rank" });
  });

  it("records both when a round qualifies for each", () => {
    const ctx = makeCtx({
      foundWords:     Array.from({ length: 20 }, (_, i) => `word${i}`),
      validWordCount: 20,
      rank:           "Απολυτότητα",
    });
    expect(kinds(ctx).sort()).toEqual(["top_rank", "tzimani"]);
  });

  it("records nothing on a custom or random puzzle", () => {
    // Milestones are keyed on a puzzle_date, so only daily rounds can produce one.
    const ctx = makeCtx({
      isDaily:        false,
      foundWords:     Array.from({ length: 20 }, (_, i) => `word${i}`),
      validWordCount: 20,
      rank:           "Απολυτότητα",
    });
    expect(detectDayMilestones(ctx)).toEqual([]);
  });

  it("records nothing for a puzzle with no valid words", () => {
    expect(detectDayMilestones(makeCtx({ foundWords: [], validWordCount: 0, rank: "Θηρίο" })))
      .toEqual([]);
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

// ── Handoff B: player-selected display badge (pure resolution) ─────────────────

describe("SELECTABLE_BADGE_IDS — the whitelist of pickable badges", () => {
  it("is exactly the base achievement ids, never the per-tier ids", () => {
    expect([...SELECTABLE_BADGE_IDS].sort()).toEqual(
      LEKSOKIPOS_ACHIEVEMENTS.map((a) => a.id).sort(),
    );
  });

  it("does not admit a per-tier id", () => {
    expect(SELECTABLE_BADGE_IDS.has("leksokipos-kynigos-pangram-chryso")).toBe(false);
  });
});

describe("qualifyingEarnedIds — which earned rows prove ownership of a badge", () => {
  it("a one-shot is owned by holding its own id", () => {
    expect(qualifyingEarnedIds("leksokipos-first-daily")).toEqual(["leksokipos-first-daily"]);
  });

  it("a tiered badge is owned by holding ANY of its tier ids", () => {
    expect(qualifyingEarnedIds("leksokipos-kynigos-pangram")).toEqual([
      "leksokipos-kynigos-pangram-chalkino",
      "leksokipos-kynigos-pangram-asimenio",
      "leksokipos-kynigos-pangram-chryso",
    ]);
  });

  it("returns [] for an unknown base id", () => {
    expect(qualifyingEarnedIds("leksokipos-nope")).toEqual([]);
  });

  it("the word-length ladder is owned by holding ANY frozen length id", () => {
    expect(qualifyingEarnedIds("leksokipos-makrylexis")).toEqual([
      "leksokipos-sidirodromos",
      "leksokipos-word-11",
      "leksokipos-word-12",
      "leksokipos-word-13",
    ]);
  });
});

describe("resolveDisplayBadge — the word-length ladder shows the rarest rung held", () => {
  it("shows the 13-letter rung when the player holds it", () => {
    expect(resolveDisplayBadge("leksokipos-makrylexis", ["leksokipos-word-13"])).toEqual({
      achievementId: "leksokipos-makrylexis",
      tier: "diamanti",
    });
  });

  it("shows the highest rung when several are held", () => {
    expect(
      resolveDisplayBadge("leksokipos-makrylexis", [
        "leksokipos-sidirodromos",
        "leksokipos-word-12",
      ]),
    ).toEqual({ achievementId: "leksokipos-makrylexis", tier: "chryso" });
  });

  it("shows a high rung held WITHOUT the lower ones (rungs are not cumulative)", () => {
    // Exact-length detection means a player can hold 13 and never have held 10.
    expect(resolveDisplayBadge("leksokipos-makrylexis", ["leksokipos-word-11"])).toEqual({
      achievementId: "leksokipos-makrylexis",
      tier: "asimenio",
    });
  });

  it("is null when no rung has been earned", () => {
    expect(resolveDisplayBadge("leksokipos-makrylexis", ["leksokipos-first-daily"])).toBeNull();
  });
});

describe("TIER_MEDALS — Greek tier → medal glyph", () => {
  it("maps each tier to its podium medal, with a rung above gold", () => {
    expect(TIER_MEDALS).toEqual({
      chalkino: "🥉",
      asimenio: "🥈",
      chryso:   "🥇",
      diamanti: "💠",
    });
  });
});

describe("resolveDisplayBadge — read-time badge resolution for the leaderboard", () => {
  it("null selection resolves to no badge", () => {
    expect(resolveDisplayBadge(null, [])).toBeNull();
  });

  it("a one-shot selection resolves to its id with no tier (trusts the stored id)", () => {
    expect(resolveDisplayBadge("leksokipos-first-daily", [])).toEqual({
      achievementId: "leksokipos-first-daily",
      tier:          null,
    });
  });

  it("a tiered selection resolves to the HIGHEST earned tier", () => {
    expect(
      resolveDisplayBadge("leksokipos-kynigos-pangram", [
        "leksokipos-kynigos-pangram-chalkino",
        "leksokipos-kynigos-pangram-asimenio",
      ]),
    ).toEqual({ achievementId: "leksokipos-kynigos-pangram", tier: "asimenio" });
  });

  it("a dangling tiered selection (no earned tier rows) resolves to no badge", () => {
    expect(resolveDisplayBadge("leksokipos-kynigos-pangram", [])).toBeNull();
  });

  it("an unknown selected id resolves to no badge", () => {
    expect(resolveDisplayBadge("leksokipos-nope", [])).toBeNull();
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
