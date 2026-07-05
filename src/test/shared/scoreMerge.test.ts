// scoreMerge.test.ts — pure best-score-wins merge planning for Sign-in Restore.
//
// When a returning player signs in on a new device (ADR 0012), the device's old
// game_scores are merged into the adopted identity: best score per
// (game_id, puzzle_date) wins. planScoreMerge decides, without touching the DB,
// which old rows to re-point, and which rows (old or canonical) lose and are
// deleted. Deleting the loser row (rather than mutating the winner's score)
// keeps each row's score consistent with its `data` blob.

import { describe, expect, it } from "vitest";
import { planScoreMerge, type MergeRow } from "@/lib/scoreMerge";

function row(id: number, game_id: string, puzzle_date: string, score: number): MergeRow {
  return { id, game_id, puzzle_date, score };
}

describe("planScoreMerge", () => {
  it("re-points a puzzle only the old device has played", () => {
    const old       = [row(1, "leksokipos", "2026-07-01", 40)];
    const canonical: MergeRow[] = [];

    const plan = planScoreMerge(old, canonical);

    expect(plan.repoint).toEqual([1]);
    expect(plan.deleteOld).toEqual([]);
    expect(plan.deleteCanonical).toEqual([]);
  });

  it("re-points the old row and drops the canonical row when the old score is higher", () => {
    const old       = [row(1, "leksokipos", "2026-07-01", 55)];
    const canonical = [row(9, "leksokipos", "2026-07-01", 40)];

    const plan = planScoreMerge(old, canonical);

    expect(plan.repoint).toEqual([1]);
    expect(plan.deleteCanonical).toEqual([9]);
    expect(plan.deleteOld).toEqual([]);
  });

  it("drops the old row when the canonical score is higher", () => {
    const old       = [row(1, "leksokipos", "2026-07-01", 30)];
    const canonical = [row(9, "leksokipos", "2026-07-01", 40)];

    const plan = planScoreMerge(old, canonical);

    expect(plan.deleteOld).toEqual([1]);
    expect(plan.repoint).toEqual([]);
    expect(plan.deleteCanonical).toEqual([]);
  });

  it("drops the old row on a tie (canonical is kept)", () => {
    const old       = [row(1, "leksokipos", "2026-07-01", 40)];
    const canonical = [row(9, "leksokipos", "2026-07-01", 40)];

    const plan = planScoreMerge(old, canonical);

    expect(plan.deleteOld).toEqual([1]);
    expect(plan.repoint).toEqual([]);
    expect(plan.deleteCanonical).toEqual([]);
  });

  it("leaves canonical-only puzzles untouched", () => {
    const old       = [row(1, "leksokipos", "2026-07-01", 40)];
    const canonical = [row(9, "leksindeseis", "2026-07-01", 4)];

    const plan = planScoreMerge(old, canonical);

    // Different game_id ⇒ different key ⇒ old row simply carries over.
    expect(plan.repoint).toEqual([1]);
    expect(plan.deleteOld).toEqual([]);
    expect(plan.deleteCanonical).toEqual([]);
  });

  it("resolves a mixed batch per puzzle, keyed by (game_id, puzzle_date)", () => {
    const old = [
      row(1, "leksokipos",  "2026-07-01", 55), // old wins → repoint 1, del canon 90
      row(2, "leksindeseis","2026-07-01", 2),  // canon wins → del old 2
      row(3, "leksiarxeio", "2026-07-01", 18), // old only → repoint 3
      row(4, "leksokipos",  "2026-07-02", 40), // tie → del old 4
    ];
    const canonical = [
      row(90, "leksokipos",  "2026-07-01", 40),
      row(91, "leksindeseis","2026-07-01", 4),
      row(92, "leksokipos",  "2026-07-02", 40),
      row(93, "vrestifrasi", "2026-07-01", 6), // canon only → untouched
    ];

    const plan = planScoreMerge(old, canonical);

    expect(plan.repoint.sort()).toEqual([1, 3]);
    expect(plan.deleteOld.sort()).toEqual([2, 4]);
    expect(plan.deleteCanonical).toEqual([90]);
  });

  it("returns an empty plan when the old device has no scores", () => {
    const plan = planScoreMerge([], [row(9, "leksokipos", "2026-07-01", 40)]);
    expect(plan).toEqual({ repoint: [], deleteOld: [], deleteCanonical: [] });
  });
});
