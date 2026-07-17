// placement.test.ts — countFirstPlaceFinishes.
//
// A "first-place finish" is being rank 1 (ties included) on a game's Daily
// leaderboard for one puzzle_date. The count is derived from game_scores
// (never stored — CONTEXT.md data-class 2). Fed every Leksokipos row (one per
// device per day, UNIQUE(game_id, device_id, puzzle_date)); a day counts when
// the device's score equals that day's top score across all devices
// (higher-is-better — ADR 0014).

import { describe, expect, it } from "vitest";

import { countFirstPlaceFinishes } from "@/lib/placement";

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
