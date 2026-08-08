// selectDailyPuzzle.test.ts — deterministic daily puzzle pick for Topothesies.
// One regional unit per day, same for every player (fair leaderboard), uniform
// over the answer set (no difficulty weighting — easy/hard days are intended
// variance). Independent of the caller's array ordering.

import { describe, expect, it } from "vitest";

import type { TopothesiesAnswer } from "@/games/topothesies/types";
import { dateToIndex } from "@/lib/puzzleRotation";
import { selectDailyPuzzle } from "@/games/topothesies/lib/selectDailyPuzzle";

function answer(id: string): TopothesiesAnswer {
  return {
    id,
    name: id,
    nameNormalized: id,
    capital: id,
    capitalNormalized: id,
    capitalCoord: [24, 39],
    centroid: [24, 39],
    aliases: [],
    region: "region",
    isIsland: false,
  };
}

const ANSWERS = ["milos", "aegina", "thasos", "naxos", "skyros", "kea"].map(answer);

describe("selectDailyPuzzle", () => {
  it("is deterministic — same date returns the same unit", () => {
    expect(selectDailyPuzzle("2026-07-21", ANSWERS).id).toBe(
      selectDailyPuzzle("2026-07-21", ANSWERS).id,
    );
  });

  it("returns an entry from the answer set", () => {
    const ids = new Set(ANSWERS.map((a) => a.id));
    expect(ids.has(selectDailyPuzzle("2026-07-21", ANSWERS).id)).toBe(true);
  });

  it("does not depend on the caller's array ordering", () => {
    const shuffled = [...ANSWERS].reverse();
    expect(selectDailyPuzzle("2026-07-21", shuffled).id).toBe(
      selectDailyPuzzle("2026-07-21", ANSWERS).id,
    );
  });

  it("matches an independent id-sorted rotation oracle", () => {
    const sortedIds = ANSWERS.map((a) => a.id).sort();
    const date = "2026-08-15";
    const expected = sortedIds[dateToIndex(date, sortedIds.length)];
    expect(selectDailyPuzzle(date, ANSWERS).id).toBe(expected);
  });

  it("advances across consecutive days (not the same unit forever)", () => {
    const picks = new Set(
      ["2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"].map(
        (d) => selectDailyPuzzle(d, ANSWERS).id,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("throws on an empty answer set", () => {
    expect(() => selectDailyPuzzle("2026-07-21", [])).toThrow();
  });
});
