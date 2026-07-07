// pangramMerge.test.ts — pure union planning for Sign-in Restore (ADR 0013, B2).
//
// Pangrams are an append-only SET, so restoring an account UNIONs the two devices'
// finds. Unlike achievements (keyed on achievement_id), pangrams dedup on the
// composite (puzzle_date, word) — the same word on a different day is a distinct
// find (B2/R1). Double-count on merge is impossible by construction: union +
// UNIQUE(device_uuid, puzzle_date, word) dedup, never a counter.

import { describe, expect, it } from "vitest";

import { planPangramMerge, type PangramMergeRow } from "@/lib/pangramMerge";

const row = (id: number, puzzle_date: string, word: string): PangramMergeRow => ({ id, puzzle_date, word });

describe("planPangramMerge", () => {
  it("re-points old finds the canonical identity doesn't already have", () => {
    const plan = planPangramMerge(
      [row(1, "2026-07-06", "διακοπτησ"), row(2, "2026-07-06", "παρακολουθηση")],
      [row(9, "2026-07-06", "θαλασσινοσ")],
    );
    expect(plan.repoint.sort((a, b) => a - b)).toEqual([1, 2]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("deletes old duplicates the canonical already holds (same day + word)", () => {
    const plan = planPangramMerge(
      [row(1, "2026-07-06", "διακοπτησ")],
      [row(9, "2026-07-06", "διακοπτησ")], // same (date, word) → UNIQUE would reject
    );
    expect(plan.repoint).toEqual([]);
    expect(plan.deleteOld).toEqual([1]);
  });

  it("treats the same word on a different day as a distinct find (re-points it)", () => {
    const plan = planPangramMerge(
      [row(1, "2026-07-07", "διακοπτησ")],
      [row(9, "2026-07-06", "διακοπτησ")], // same word, different day → NOT a duplicate
    );
    expect(plan.repoint).toEqual([1]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("produces the union: carry-overs re-pointed, exact overlaps dropped", () => {
    const plan = planPangramMerge(
      [
        row(1, "2026-07-06", "διακοπτησ"),     // overlaps canonical → delete
        row(2, "2026-07-06", "παρακολουθηση"), // new → repoint
        row(3, "2026-07-07", "διακοπτησ"),     // same word other day → repoint
      ],
      [row(9, "2026-07-06", "διακοπτησ")],
    );
    expect(plan.repoint.sort((a, b) => a - b)).toEqual([2, 3]);
    expect(plan.deleteOld).toEqual([1]);
  });

  it("is a no-op when the old device found nothing", () => {
    const plan = planPangramMerge([], [row(9, "2026-07-06", "διακοπτησ")]);
    expect(plan).toEqual({ repoint: [], deleteOld: [] });
  });
});
