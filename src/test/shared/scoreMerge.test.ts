// scoreMerge.test.ts — the pure folds over game_scores rows.
//
// planScoreMerge: when a returning player signs in on a new device (ADR 0012),
// the device's old game_scores are merged into the adopted identity: best score
// per (game_id, puzzle_date) wins. It decides, without touching the DB, which old
// rows to re-point, and which rows (old or canonical) lose and are deleted.
// Deleting the loser row (rather than mutating the winner's score) keeps each
// row's score consistent with its `data` blob.
//
// mergeLengthScore: Leksiarxeio posts one result per word length but keeps one
// row per player per day, so each post folds a length into that row. This fold
// used to live inside the POST /api/game-scores handler, where reaching it meant
// faking a request and a database — so the branches most likely to be wrong (no
// row yet; the same length posting twice) went untested while a one-line sum sat
// extracted next to it. Testing it is now one line per case.

import { describe, expect, it } from "vitest";
import { mergeLengthScore, planScoreMerge, type MergeRow } from "@/lib/scoreMerge";

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

// ── mergeLengthScore — Leksiarxeio's per-length fold ──────────────────────────

describe("mergeLengthScore", () => {
  it("starts the day's row when the player has no row yet", () => {
    // The first post of the day: existing is null because the .single() lookup
    // found nothing. This is the branch a faked-request test most easily misses.
    expect(mergeLengthScore(null, 5, 4)).toEqual({ data: { "5": 4 }, score: 4 });
  });

  it("treats undefined the same as no row", () => {
    // A row exists but its `data` is null — same starting point.
    expect(mergeLengthScore(undefined, 5, 4)).toEqual({ data: { "5": 4 }, score: 4 });
  });

  it("folds a new length into an existing row and re-totals", () => {
    expect(mergeLengthScore({ "4": 6 }, 5, 4)).toEqual({
      data:  { "4": 6, "5": 4 },
      score: 10,
    });
  });

  it("totals every length once all five are in", () => {
    const data = { "4": 6, "5": 5, "6": 4, "7": 3 };
    expect(mergeLengthScore(data, 8, 2)).toEqual({
      data:  { "4": 6, "5": 5, "6": 4, "7": 3, "8": 2 },
      score: 20,
    });
  });

  it("overwrites a length that posts twice rather than double-counting it", () => {
    // The retry / outbox-flush case. The score must reflect one 5-length result,
    // not two — the failure mode would be a silently inflated leaderboard row.
    const first = mergeLengthScore({ "4": 6 }, 5, 3);
    const again = mergeLengthScore(first.data, 5, 3);
    expect(again).toEqual({ data: { "4": 6, "5": 3 }, score: 9 });
  });

  it("is idempotent — replaying the same post never moves the score", () => {
    const once  = mergeLengthScore({ "4": 6, "5": 3 }, 6, 5);
    const twice = mergeLengthScore(once.data, 6, 5);
    expect(twice).toEqual(once);
  });

  it("lets a re-post lower the length, and re-totals to match", () => {
    // Documenting the rule deliberately: last write wins, it is not max-wins.
    // Safe because a length is played once a day, so a re-post is a replay of an
    // identical result. If Leksiarxeio ever allows replaying a length for a
    // better result, this expectation is the one that should fail first.
    expect(mergeLengthScore({ "4": 6, "5": 6 }, 5, 1)).toEqual({
      data:  { "4": 6, "5": 1 },
      score: 7,
    });
  });

  it("records a zero-point (lost) length rather than dropping it", () => {
    // scoreLeksiarxeio maps a lost game to 0. The length must still appear in
    // `data` — the row is the record of which lengths were played.
    expect(mergeLengthScore({ "4": 6 }, 5, 0)).toEqual({
      data:  { "4": 6, "5": 0 },
      score: 6,
    });
  });

  it("does not mutate the caller's existing data", () => {
    // The route hands in the blob it read from the DB; a fold that mutated it
    // would make the read-modify-write depend on argument aliasing.
    const existing = { "4": 6 };
    mergeLengthScore(existing, 5, 4);
    expect(existing).toEqual({ "4": 6 });
  });
});
