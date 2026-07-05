// achievementMerge.test.ts — pure union planning for Sign-in Restore (ADR 0013).

import { describe, expect, it } from "vitest";

import { planAchievementMerge, type AchievementMergeRow } from "@/lib/achievementMerge";

const row = (id: number, achievement_id: string): AchievementMergeRow => ({ id, achievement_id });

describe("planAchievementMerge", () => {
  it("re-points old achievements the canonical identity doesn't already have", () => {
    const plan = planAchievementMerge(
      [row(1, "leksokipos-tzimani"), row(2, "leksokipos-sidirodromos")],
      [row(9, "leksokipos-first-daily")],
    );
    expect(plan.repoint.sort()).toEqual([1, 2]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("deletes old duplicates the canonical already earned (unique constraint)", () => {
    const plan = planAchievementMerge(
      [row(1, "leksokipos-tzimani")],
      [row(9, "leksokipos-tzimani")], // canonical already has it
    );
    expect(plan.repoint).toEqual([]);
    expect(plan.deleteOld).toEqual([1]);
  });

  it("produces the union: carry-overs re-pointed, overlaps dropped", () => {
    const plan = planAchievementMerge(
      [row(1, "leksokipos-tzimani"), row(2, "leksokipos-first-daily"), row(3, "leksokipos-theristis")],
      [row(9, "leksokipos-first-daily")], // overlap on first-daily
    );
    expect(plan.repoint.sort()).toEqual([1, 3]);
    expect(plan.deleteOld).toEqual([2]);
  });

  it("is a no-op when the old device earned nothing", () => {
    const plan = planAchievementMerge([], [row(9, "leksokipos-tzimani")]);
    expect(plan).toEqual({ repoint: [], deleteOld: [] });
  });
});
