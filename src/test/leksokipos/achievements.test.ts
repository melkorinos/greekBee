// achievements.test.ts — the Leksokipos trophy catalog (display data only).
//
// This slice ships the frozen catalog, not the detection engine. The ids become
// player_achievements.achievement_id and FREEZE on first deploy, so the tests
// guard the ids and their uniqueness — renaming/removing an id after ship is a
// data-migration hazard, adding new tiers later is safe.

import { describe, expect, it } from "vitest";

import { LEKSOKIPOS_ACHIEVEMENTS } from "@/games/leksokipos/lib/achievements";

function ids() {
  return LEKSOKIPOS_ACHIEVEMENTS.map((a) => a.id);
}

describe("LEKSOKIPOS_ACHIEVEMENTS catalog", () => {
  it("contains the frozen one-shot badge ids", () => {
    expect(ids()).toEqual(
      expect.arrayContaining([
        "leksokipos-first-daily",
        "leksokipos-stin-korifi",
        "leksokipos-tzimani",
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
