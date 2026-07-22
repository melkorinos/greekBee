// wordsMerge.test.ts — pure union planning for Sign-in Restore (ADR 0013 lane C).
//
// player_words is an append-only SET, so restoring an account UNIONs the two
// devices' finds. Dedup key is the composite (puzzle_date, word) — the same word on
// a different day is a distinct find. Double-count on merge is impossible by
// construction: union + UNIQUE(device_uuid, puzzle_date, word) dedup, never a
// counter. Same shape as planPangramMerge.

import { describe, expect, it } from "vitest";

import { planWordsMerge, type WordsMergeRow } from "@/lib/wordsMerge";

const row = (id: number, puzzle_date: string, word: string): WordsMergeRow => ({ id, puzzle_date, word });

describe("planWordsMerge", () => {
  it("re-points old finds the canonical identity doesn't already have", () => {
    const plan = planWordsMerge(
      [row(1, "2026-07-06", "γατα"), row(2, "2026-07-06", "σπιτι")],
      [row(9, "2026-07-06", "θαλασσα")],
    );
    expect(plan.repoint.sort((a, b) => a - b)).toEqual([1, 2]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("deletes old duplicates the canonical already holds (same day + word)", () => {
    const plan = planWordsMerge(
      [row(1, "2026-07-06", "γατα")],
      [row(9, "2026-07-06", "γατα")], // same (date, word) → UNIQUE would reject
    );
    expect(plan.repoint).toEqual([]);
    expect(plan.deleteOld).toEqual([1]);
  });

  it("treats the same word on a different day as a distinct find (re-points it)", () => {
    const plan = planWordsMerge(
      [row(1, "2026-07-07", "γατα")],
      [row(9, "2026-07-06", "γατα")], // same word, different day → NOT a duplicate
    );
    expect(plan.repoint).toEqual([1]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("produces the union: carry-overs re-pointed, exact overlaps dropped", () => {
    const plan = planWordsMerge(
      [
        row(1, "2026-07-06", "γατα"),  // overlaps canonical → delete
        row(2, "2026-07-06", "σπιτι"), // new → repoint
        row(3, "2026-07-07", "γατα"),  // same word other day → repoint
      ],
      [row(9, "2026-07-06", "γατα")],
    );
    expect(plan.repoint.sort((a, b) => a - b)).toEqual([2, 3]);
    expect(plan.deleteOld).toEqual([1]);
  });

  it("is a no-op when the old device found nothing", () => {
    const plan = planWordsMerge([], [row(9, "2026-07-06", "γατα")]);
    expect(plan).toEqual({ repoint: [], deleteOld: [] });
  });
});
