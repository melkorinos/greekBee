// milestoneMerge.test.ts — pure union planning for Sign-in Restore (ADR 0013).
//
// player_milestones absorbs the pangram and word find-sets and adds the two day
// counters, so one merge replaces planPangramMerge + planWordsMerge. Milestones
// are an append-only SET: restoring an account UNIONs the two devices' rows. The
// dedup key is the composite (puzzle_date, kind, detail) — the same word on a
// different day is a distinct find, and two kinds on one day never collide.
// Double-count on merge is impossible by construction: union +
// UNIQUE(device_uuid, puzzle_date, kind, detail) dedup, never a counter.

import { describe, expect, it } from "vitest";

import { planMilestoneMerge, type MilestoneMergeRow } from "@/lib/milestoneMerge";

const row = (
  id:          number,
  puzzle_date: string,
  kind:        string,
  detail:      string,
): MilestoneMergeRow => ({ id, puzzle_date, kind, detail });

describe("planMilestoneMerge", () => {
  it("re-points old rows the canonical identity doesn't already have", () => {
    const plan = planMilestoneMerge(
      [
        row(1, "2026-07-06", "pangram", "διακοπτησ"),
        row(2, "2026-07-06", "word", "παρακολουθηση"),
      ],
      [row(9, "2026-07-06", "pangram", "θαλασσινοσ")],
    );
    expect(plan.repoint.sort((a, b) => a - b)).toEqual([1, 2]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("deletes old duplicates the canonical already holds (same day, kind and detail)", () => {
    const plan = planMilestoneMerge(
      [row(1, "2026-07-06", "pangram", "διακοπτησ")],
      [row(9, "2026-07-06", "pangram", "διακοπτησ")], // UNIQUE would reject the pair
    );
    expect(plan.repoint).toEqual([]);
    expect(plan.deleteOld).toEqual([1]);
  });

  it("treats the same word on a different day as a distinct find (re-points it)", () => {
    const plan = planMilestoneMerge(
      [row(1, "2026-07-07", "pangram", "διακοπτησ")],
      [row(9, "2026-07-06", "pangram", "διακοπτησ")],
    );
    expect(plan.repoint).toEqual([1]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("treats the same word under a different kind as distinct (word vs pangram)", () => {
    // A pangram is also a valid find, so one word can legitimately hold a row of
    // each kind on the same date. Keying on detail alone would collapse them.
    const plan = planMilestoneMerge(
      [row(1, "2026-07-06", "word", "διακοπτησ")],
      [row(9, "2026-07-06", "pangram", "διακοπτησ")],
    );
    expect(plan.repoint).toEqual([1]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("keeps the two detail-less day counters apart on the same date", () => {
    // top_rank and tzimani both carry detail '' — the kind is the only thing
    // separating them, which is why detail is NOT NULL DEFAULT '' and not nullable.
    const plan = planMilestoneMerge(
      [row(1, "2026-07-06", "top_rank", "")],
      [row(9, "2026-07-06", "tzimani", "")],
    );
    expect(plan.repoint).toEqual([1]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("deletes a detail-less counter the canonical already holds for that day", () => {
    const plan = planMilestoneMerge(
      [row(1, "2026-07-06", "top_rank", "")],
      [row(9, "2026-07-06", "top_rank", "")],
    );
    expect(plan.repoint).toEqual([]);
    expect(plan.deleteOld).toEqual([1]);
  });

  it("produces the union: carry-overs re-pointed, exact overlaps dropped", () => {
    const plan = planMilestoneMerge(
      [
        row(1, "2026-07-06", "pangram", "διακοπτησ"),     // overlaps → delete
        row(2, "2026-07-06", "word", "παρακολουθηση"),    // new → repoint
        row(3, "2026-07-07", "pangram", "διακοπτησ"),     // other day → repoint
        row(4, "2026-07-06", "tzimani", ""),              // new counter → repoint
      ],
      [
        row(9, "2026-07-06", "pangram", "διακοπτησ"),
        row(10, "2026-07-06", "top_rank", ""),
      ],
    );
    expect(plan.repoint.sort((a, b) => a - b)).toEqual([2, 3, 4]);
    expect(plan.deleteOld).toEqual([1]);
  });

  it("is a no-op when the old device has no milestones", () => {
    const plan = planMilestoneMerge([], [row(9, "2026-07-06", "pangram", "διακοπτησ")]);
    expect(plan).toEqual({ repoint: [], deleteOld: [] });
  });
});
