// achievements.test.ts — the Leksokipos trophy catalog (display data only).
//
// This slice ships the frozen catalog, not the detection engine. The ids become
// player_achievements.achievement_id and FREEZE on first deploy, so the tests
// guard the ids and their uniqueness — renaming/removing an id after ship is a
// data-migration hazard, adding new tiers later is safe.

import { describe, expect, it } from "vitest";

import {
  LEKSOKIPOS_ACHIEVEMENTS,
  MAKRYLEXIS_ID,
  WORD_LENGTH_BADGES,
  SELECTABLE_BADGE_IDS,
  qualifyingEarnedIds,
  resolveDisplayBadge,
  detectEarnedAchievements,
  detectDayMilestones,
  detectEarnedPointsTiers,
  detectEarnedPangramTiers,
  detectEarnedTopRankTiers,
  detectEarnedTzimaniTiers,
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
  it("contains exactly the five rebuilt badges, every one tiered", () => {
    // TICKET-02: the catalog is five entries and no one-shot ENTRY survives — the
    // tier treatment is how every badge reads, not decoration on some of them.
    expect(ids()).toEqual([
      "leksokipos-stin-korifi",
      "leksokipos-makrylexis",
      "leksokipos-tzimani",
      "leksokipos-kynigos-pangram",
      "leksokipos-syllektis-ponton",
    ]);
    for (const a of LEKSOKIPOS_ACHIEVEMENTS) expect(a.kind).toBe("tiered");
  });

  it("retires Πρώτα Βήματα and the Θεριστής id permanently", () => {
    // Both are frozen-id exceptions licensed ONLY by the pre-launch wipe (ADR 0013
    // §4). Neither id may appear anywhere in the catalog again — not as an entry,
    // not as a tier id.
    const all = LEKSOKIPOS_ACHIEVEMENTS.flatMap((a) => [a.id, ...(a.tiers ?? []).map((t) => t.id)]);
    expect(all).not.toContain("leksokipos-first-daily");
    expect(all).not.toContain("leksokipos-theristis");
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

  it("gives every entry a drawn mark on the shared 24×24 canvas", () => {
    // One flattened path per badge, so the catalog stores path DATA and never raw
    // SVG markup. A shared viewBox is what lets one BadgeMark scale all five.
    for (const a of LEKSOKIPOS_ACHIEVEMENTS) {
      expect(a.mark.viewBox).toBe("0 0 24 24");
      expect(a.mark.path).toMatch(/^M/);
    }
  });

  it("assigns the operator-approved mark to each badge", () => {
    // The five drawings are art the operator signed off on (TICKET-03) — a silent
    // change should fail.
    // Marks never carry tier colour, so these five serve every tier at every size.
    const pathByName = Object.fromEntries(
      LEKSOKIPOS_ACHIEVEMENTS.map((a) => [a.name, a.mark.path]),
    );
    expect(pathByName).toEqual({
      "Στην Κορυφή":      "M14 3.2 22 20.4H6zM6.8 9.8 12.6 20.4H2z",
      "Μακρυλέξης":      "M9.6 3h1.6L4.6 21H1.4zM12.8 3h1.6L22.6 21h-3.2zM8.2 9h7.6v1.9H8.2zM5.8 15.6h12.4v2.1H5.8z",
      "Τζιμάνι":         "M12.00 8.90A3.8 3.2 -90.00 0 1 12.00 1.30A3.8 3.2 -90.00 0 1 12.00 8.90ZM14.68 10.45A3.8 3.2 -30.00 0 1 21.27 6.65A3.8 3.2 -30.00 0 1 14.68 10.45ZM14.68 13.55A3.8 3.2 30.00 0 1 21.27 17.35A3.8 3.2 30.00 0 1 14.68 13.55ZM12.00 15.10A3.8 3.2 90.00 0 1 12.00 22.70A3.8 3.2 90.00 0 1 12.00 15.10ZM9.32 13.55A3.8 3.2 150.00 0 1 2.73 17.35A3.8 3.2 150.00 0 1 9.32 13.55ZM9.32 10.45A3.8 3.2 210.00 0 1 2.73 6.65A3.8 3.2 210.00 0 1 9.32 10.45Z",
      "Κυνηγός Πανγκράμ": "M14.2 2.2 3.6 13.9h5.9l-1 7.9L20.4 10.1h-6.1z",
      "Συλλέκτης Πόντων": "M7.6 2.6h8.8l4.8 6.4L12 21.4 2.8 9z",
    });
  });

  it("carries no emoji glyph on any badge or ladder rung", () => {
    // TICKET-03 deleted `glyph` outright — emoji render differently on every platform
    // and, worse, are indistinguishable from an emoji a player put in their own
    // display_name (which has no validation). Re-adding one must fail here.
    for (const a of LEKSOKIPOS_ACHIEVEMENTS) expect(a).not.toHaveProperty("glyph");
    for (const b of WORD_LENGTH_BADGES) expect(b).not.toHaveProperty("glyph");
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

  // The rungs carried invented names (Σιδηρόδρομος / Υπερταχεία / Νταλίκα / Σεντόνι)
  // that gave a player no way to tell which outranked which. They are labelled by
  // the word length now, and the id stays frozen underneath — this pins both halves.
  it("labels every rung by its word length and carries no invented rung names", () => {
    const ladder = LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === MAKRYLEXIS_ID);
    expect(ladder?.tiers?.map((t) => t.label)).toEqual(
      LEKSOKIPOS_ACHIEVEMENT_TUNING.wordLengthBadges.map((n) => `${n} γράμματα`),
    );
    for (const b of WORD_LENGTH_BADGES) expect(b).not.toHaveProperty("name");
  });

  // A rung label that already states its threshold must not have it appended again
  // by the Trophy Case chip — "10 γράμματα · 10". The flag is what the chip reads.
  it("flags the ladder as self-describing, and leaves the metal ladders unflagged", () => {
    for (const a of LEKSOKIPOS_ACHIEVEMENTS) {
      expect(Boolean(a.tierLabelsIncludeThreshold)).toBe(a.id === MAKRYLEXIS_ID);
    }
  });
});

describe("detectEarnedAchievements — the word-length ladder is all that is left", () => {
  // TICKET-02 moved every other badge onto a lifetime day-count read back from the
  // server (Στην Κορυφή / Τζιμάνι) or a lifetime aggregate (pangrams / points).
  // What an end-of-game snapshot can still decide by itself is exact word lengths.
  it("returns only word-length ids, even for a round that maxes every other condition", () => {
    const ctx = makeCtx({
      foundWords:     ["α".repeat(11), ...Array.from({ length: 19 }, (_, i) => `word${i}`)],
      validWordCount: 20, // 100% found
      rank:           "Απολυτότητα",
    });
    expect(detectEarnedAchievements(ctx)).toEqual([lengthBadgeId(11)]);
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

// ── The two day-count tiered badges (TICKET-02) ───────────────────────────────
//
// Both read a LIFETIME count of qualifying DAYS off player_milestones, so like the
// pangram and points badges they are detected from a server-returned number, not
// from the end-of-game snapshot. The snapshot's job is only to record the day
// (detectDayMilestones above); crossing a rung is decided here.

describe("detectEarnedTopRankTiers — Στην Κορυφή (lifetime top-rank days)", () => {
  const { chalkino, asimenio, chryso } = LEKSOKIPOS_ACHIEVEMENT_TUNING.topRankTierThresholds;

  it("earns nothing on zero qualifying days", () => {
    expect(detectEarnedTopRankTiers(0)).toEqual([]);
  });

  it("earns χάλκινο on the first qualifying day", () => {
    // Bronze at 1 deliberately preserves the meaning of the one-shot it replaces.
    expect(chalkino).toBe(1);
    expect(detectEarnedTopRankTiers(1)).toEqual(["leksokipos-stin-korifi-chalkino"]);
  });

  it("earns every tier crossed, ascending", () => {
    expect(detectEarnedTopRankTiers(asimenio)).toEqual([
      "leksokipos-stin-korifi-chalkino",
      "leksokipos-stin-korifi-asimenio",
    ]);
    expect(detectEarnedTopRankTiers(chryso)).toEqual([
      "leksokipos-stin-korifi-chalkino",
      "leksokipos-stin-korifi-asimenio",
      "leksokipos-stin-korifi-chryso",
    ]);
  });
});

describe("detectEarnedTzimaniTiers — Τζιμάνι (lifetime days at the found-word ratio)", () => {
  const { chalkino, asimenio, chryso } = LEKSOKIPOS_ACHIEVEMENT_TUNING.tzimaniTierThresholds;

  it("earns nothing on zero qualifying days", () => {
    expect(detectEarnedTzimaniTiers(0)).toEqual([]);
  });

  it("earns χάλκινο on the first qualifying day", () => {
    expect(chalkino).toBe(1);
    expect(detectEarnedTzimaniTiers(1)).toEqual(["leksokipos-tzimani-chalkino"]);
  });

  it("earns every tier crossed, ascending", () => {
    expect(detectEarnedTzimaniTiers(asimenio)).toEqual([
      "leksokipos-tzimani-chalkino",
      "leksokipos-tzimani-asimenio",
    ]);
    expect(detectEarnedTzimaniTiers(chryso)).toEqual([
      "leksokipos-tzimani-chalkino",
      "leksokipos-tzimani-asimenio",
      "leksokipos-tzimani-chryso",
    ]);
  });

  it("counts DAYS, not the ratio — the ladder never climbs the percentage", () => {
    // A 90/100% rung would be the retired perfect-round concept under a new name
    // (ADR 0013). Every rung qualifies on the same tzimaniFoundRatio.
    const tzimani = LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === "leksokipos-tzimani");
    expect(tzimani?.tiers?.map((t) => t.threshold)).toEqual([chalkino, asimenio, chryso]);
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
  // TICKET-02 raised these 10/20/50 → 25/60/150. The old numbers put gold at ~11
  // played days and one beta device already held it; a threshold can be lowered
  // later but never effectively raised, so this was the correctable direction and
  // the pre-launch window was the only chance to take it.
  it("earns nothing below the first threshold", () => {
    expect(detectEarnedPangramTiers(24)).toEqual([]);
    expect(detectEarnedPangramTiers(0)).toEqual([]);
  });

  it("earns χάλκινο at exactly its threshold", () => {
    expect(detectEarnedPangramTiers(25)).toEqual(["leksokipos-kynigos-pangram-chalkino"]);
  });

  it("earns every tier crossed, ascending", () => {
    expect(detectEarnedPangramTiers(60)).toEqual([
      "leksokipos-kynigos-pangram-chalkino",
      "leksokipos-kynigos-pangram-asimenio",
    ]);
    expect(detectEarnedPangramTiers(150)).toEqual([
      "leksokipos-kynigos-pangram-chalkino",
      "leksokipos-kynigos-pangram-asimenio",
      "leksokipos-kynigos-pangram-chryso",
    ]);
  });
});

describe("nextPangramTierThreshold — Trophy Case 'X / N' denominator", () => {
  it("points at χάλκινο before any tier is crossed", () => {
    expect(nextPangramTierThreshold(0)).toBe(25);
    expect(nextPangramTierThreshold(24)).toBe(25);
  });

  it("advances to the next uncrossed threshold", () => {
    expect(nextPangramTierThreshold(25)).toBe(60);
    expect(nextPangramTierThreshold(60)).toBe(150);
  });

  it("is null once every tier is crossed", () => {
    expect(nextPangramTierThreshold(150)).toBeNull();
    expect(nextPangramTierThreshold(999)).toBeNull();
  });
});

describe("describeAchievement — earned-id → toast display", () => {
  it("resolves a bare word-length rung to the ladder's name plus its rung label", () => {
    expect(describeAchievement("leksokipos-word-13")).toMatchObject({
      name: "Μακρυλέξης",
      tierLabel: "13 γράμματα",
    });
  });

  it("resolves a tier id to the badge name plus the Greek tier label", () => {
    expect(describeAchievement("leksokipos-syllektis-ponton-asimenio")).toMatchObject({
      name: "Συλλέκτης Πόντων",
      tierLabel: "Ασημένιο",
    });
  });

  it("carries the BASE badge's mark for a tier id, not the tier's own", () => {
    // The toast is handed a freshly-earned id, which for every badge in the rebuilt
    // catalog is a TIER id — so the only way it can draw the right art is if the
    // resolver that already walks tiers hands the mark down. A tier never has its
    // own drawing: the tier is the frame, the mark is the badge.
    const ladder = LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === "leksokipos-makrylexis");
    expect(describeAchievement("leksokipos-word-11")?.mark).toEqual(ladder?.mark);

    const points = LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === "leksokipos-syllektis-ponton");
    expect(describeAchievement("leksokipos-syllektis-ponton-chryso")?.mark).toEqual(points?.mark);
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
    expect(resolveDisplayBadge("leksokipos-makrylexis", ["leksokipos-word-nope"])).toBeNull();
  });
});

describe("resolveDisplayBadge — read-time badge resolution for the leaderboard", () => {
  it("null selection resolves to no badge", () => {
    expect(resolveDisplayBadge(null, [])).toBeNull();
  });

  it("a selection of a RETIRED id resolves to no badge", () => {
    // The launch reset NULLs every player_profiles.selected_badge_id, but this is
    // the backstop if it is ever run partially: 34 devices had Πρώτα Βήματα
    // selected, and an unresolvable id must render nothing rather than crash.
    expect(resolveDisplayBadge("leksokipos-first-daily", [])).toBeNull();
    expect(resolveDisplayBadge("leksokipos-theristis", [])).toBeNull();
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
