// placement.test.ts — countFirstPlaceFinishes.
//
// A "first-place finish" is being rank 1 (ties included) on a game's Daily
// leaderboard for one puzzle_date. The count is derived from game_scores
// (never stored — CONTEXT.md data-class 2). Fed every Leksokipos row (one per
// device per day, UNIQUE(game_id, device_id, puzzle_date)); a day counts when
// the device's score equals that day's top score across all devices
// (higher-is-better — ADR 0014).

import { describe, expect, it } from "vitest";

import { countFirstPlaceFinishes, countPodiumFinishes } from "@/lib/placement";

describe("countFirstPlaceFinishes", () => {
  it("counts a day the device had the sole top score", () => {
    const rows = [
      { device_id: "me",    puzzle_date: "2026-07-10", score: 90 },
      { device_id: "other", puzzle_date: "2026-07-10", score: 40 },
    ];
    expect(countFirstPlaceFinishes(rows, "me")).toBe(1);
  });

  it("does not count a day the device was beaten", () => {
    const rows = [
      { device_id: "me",    puzzle_date: "2026-07-10", score: 40 },
      { device_id: "other", puzzle_date: "2026-07-10", score: 90 },
    ];
    expect(countFirstPlaceFinishes(rows, "me")).toBe(0);
  });

  it("counts a tie for the top score as first for both (ties share rank 1)", () => {
    const rows = [
      { device_id: "me",    puzzle_date: "2026-07-10", score: 90 },
      { device_id: "other", puzzle_date: "2026-07-10", score: 90 },
    ];
    expect(countFirstPlaceFinishes(rows, "me")).toBe(1);
    expect(countFirstPlaceFinishes(rows, "other")).toBe(1);
  });

  it("sums firsts across multiple days, ignoring days the device did not top", () => {
    const rows = [
      { device_id: "me",    puzzle_date: "2026-07-10", score: 90 }, // first
      { device_id: "other", puzzle_date: "2026-07-10", score: 40 },
      { device_id: "me",    puzzle_date: "2026-07-11", score: 30 }, // beaten
      { device_id: "other", puzzle_date: "2026-07-11", score: 55 },
      { device_id: "me",    puzzle_date: "2026-07-12", score: 70 }, // first (only player)
    ];
    expect(countFirstPlaceFinishes(rows, "me")).toBe(2);
  });

  it("returns 0 for a device with no rows", () => {
    const rows = [
      { device_id: "other", puzzle_date: "2026-07-10", score: 90 },
    ];
    expect(countFirstPlaceFinishes(rows, "me")).toBe(0);
  });

  it("returns 0 for an empty history", () => {
    expect(countFirstPlaceFinishes([], "me")).toBe(0);
  });
});

// countPodiumFinishes — the full podium in one pass, competition ranking (ties
// share a rank, and shared ranks consume the ranks below: 90, 90, 80 → the 80 is
// 3rd, that day has no 2nd). rank = 1 + (devices strictly above), matching the
// leaderboard's playerRow rank so profile and leaderboard agree.
describe("countPodiumFinishes", () => {
  it("counts a sole top score as one first, nothing else", () => {
    const rows = [
      { device_id: "me",    puzzle_date: "2026-07-10", score: 90 },
      { device_id: "other", puzzle_date: "2026-07-10", score: 40 },
    ];
    expect(countPodiumFinishes(rows, "me")).toEqual({ first: 1, second: 0, third: 0 });
  });

  it("counts the runner-up as a second", () => {
    const rows = [
      { device_id: "top", puzzle_date: "2026-07-10", score: 90 },
      { device_id: "me",  puzzle_date: "2026-07-10", score: 60 },
      { device_id: "low", puzzle_date: "2026-07-10", score: 40 },
    ];
    expect(countPodiumFinishes(rows, "me")).toEqual({ first: 0, second: 1, third: 0 });
  });

  it("counts third place", () => {
    const rows = [
      { device_id: "a",  puzzle_date: "2026-07-10", score: 90 },
      { device_id: "b",  puzzle_date: "2026-07-10", score: 60 },
      { device_id: "me", puzzle_date: "2026-07-10", score: 40 },
    ];
    expect(countPodiumFinishes(rows, "me")).toEqual({ first: 0, second: 0, third: 1 });
  });

  it("ties share rank 1; the next distinct score drops below the shared rank", () => {
    // 90, 90, 80 → both 90s are 1st, the 80 is 3rd (1 + 2 strictly above). No 2nd.
    const rows = [
      { device_id: "a",  puzzle_date: "2026-07-10", score: 90 },
      { device_id: "b",  puzzle_date: "2026-07-10", score: 90 },
      { device_id: "me", puzzle_date: "2026-07-10", score: 80 },
    ];
    expect(countPodiumFinishes(rows, "a")).toEqual({ first: 1, second: 0, third: 0 });
    expect(countPodiumFinishes(rows, "b")).toEqual({ first: 1, second: 0, third: 0 });
    expect(countPodiumFinishes(rows, "me")).toEqual({ first: 0, second: 0, third: 1 });
  });

  it("ties for second consume the third rank (90, 60, 60 → no 3rd)", () => {
    const rows = [
      { device_id: "a",  puzzle_date: "2026-07-10", score: 90 },
      { device_id: "b",  puzzle_date: "2026-07-10", score: 60 },
      { device_id: "me", puzzle_date: "2026-07-10", score: 60 },
    ];
    expect(countPodiumFinishes(rows, "me")).toEqual({ first: 0, second: 1, third: 0 });
    expect(countPodiumFinishes(rows, "b")).toEqual({ first: 0, second: 1, third: 0 });
  });

  it("a fourth-place score is not on the podium at all", () => {
    const rows = [
      { device_id: "a",  puzzle_date: "2026-07-10", score: 90 },
      { device_id: "b",  puzzle_date: "2026-07-10", score: 80 },
      { device_id: "c",  puzzle_date: "2026-07-10", score: 70 },
      { device_id: "me", puzzle_date: "2026-07-10", score: 60 },
    ];
    expect(countPodiumFinishes(rows, "me")).toEqual({ first: 0, second: 0, third: 0 });
  });

  it("a lone player on a day is first", () => {
    const rows = [{ device_id: "me", puzzle_date: "2026-07-10", score: 5 }];
    expect(countPodiumFinishes(rows, "me")).toEqual({ first: 1, second: 0, third: 0 });
  });

  it("sums each podium tier across days independently", () => {
    const rows = [
      { device_id: "me",  puzzle_date: "2026-07-10", score: 90 }, // 1st
      { device_id: "x",   puzzle_date: "2026-07-10", score: 40 },
      { device_id: "top", puzzle_date: "2026-07-11", score: 99 },
      { device_id: "me",  puzzle_date: "2026-07-11", score: 50 }, // 2nd
      { device_id: "p",   puzzle_date: "2026-07-12", score: 99 },
      { device_id: "q",   puzzle_date: "2026-07-12", score: 80 },
      { device_id: "me",  puzzle_date: "2026-07-12", score: 50 }, // 3rd
    ];
    expect(countPodiumFinishes(rows, "me")).toEqual({ first: 1, second: 1, third: 1 });
  });

  it("returns all zeros for a device with no rows and for empty history", () => {
    expect(countPodiumFinishes([{ device_id: "x", puzzle_date: "2026-07-10", score: 9 }], "me"))
      .toEqual({ first: 0, second: 0, third: 0 });
    expect(countPodiumFinishes([], "me")).toEqual({ first: 0, second: 0, third: 0 });
  });
});
