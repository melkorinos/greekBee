// puzzleIndex.test.ts
//
// Guards the slim puzzle index (puzzles-index-el.json) that the /leksokipos
// redirect page uses instead of the full 4 MB puzzles-el.json (Fluid CPU cost —
// see src/data/leksokipos/puzzleIndex.ts).
//
// 1. Drift guard: the committed index must be exactly re-derivable from
//    puzzles-el.json. If a script changes puzzles (generate-puzzle,
//    batch-generate), run `npm run generate-puzzle-index` to refresh it.
// 2. Parity: the stub lookups must behave identically to their full-loader
//    counterparts — the redirect page and the [center]/[outer] page must agree
//    on which puzzle a date maps to.

import { describe, expect, it } from "vitest";

import {
  getPuzzleStubForDate,
  getRandomPuzzleStub,
  getTodaysPuzzleStub,
} from "@/data/leksokipos/puzzleIndex";
import { getPuzzleForDate, getTodaysPuzzle } from "@/data/leksokipos/index";
import fullPuzzles from "@/data/leksokipos/puzzles-el.json";
import puzzleIndex from "@/data/leksokipos/puzzles-index-el.json";

interface FullPuzzle {
  id: string;
  date: string;
  centerLetter: string;
  outerLetters: string[];
}

const FULL = fullPuzzles as FullPuzzle[];

describe("puzzles-index-el.json — drift guard", () => {
  it("is exactly re-derivable from puzzles-el.json (run `npm run generate-puzzle-index` if this fails)", () => {
    const derived = FULL.map(({ id, date, centerLetter, outerLetters }) => ({
      id,
      date,
      centerLetter,
      outerLetters,
    }));
    expect(puzzleIndex).toEqual(derived);
  });

  it("carries no validWords (the whole point is staying small)", () => {
    for (const stub of puzzleIndex as Record<string, unknown>[]) {
      expect(stub).not.toHaveProperty("validWords");
    }
  });
});

describe("puzzleIndex — parity with the full loader", () => {
  it("getPuzzleStubForDate matches getPuzzleForDate for a known date", () => {
    const date = FULL[0].date;
    const stub = getPuzzleStubForDate(date);
    const full = getPuzzleForDate(date);

    expect(stub.id).toBe(full.id);
    expect(stub.centerLetter).toBe(full.centerLetter);
    expect(stub.outerLetters).toEqual(full.outerLetters);
  });

  it("falls back to the most recent puzzle for an unknown date, like the full loader", () => {
    const stub = getPuzzleStubForDate("1900-01-01");
    const full = getPuzzleForDate("1900-01-01");
    expect(stub.id).toBe(full.id);
  });

  it("getTodaysPuzzleStub matches getTodaysPuzzle", () => {
    expect(getTodaysPuzzleStub().id).toBe(getTodaysPuzzle().id);
  });

  it("getRandomPuzzleStub respects excludeId and returns a real puzzle", () => {
    const excluded = FULL[0].id;
    for (let i = 0; i < 20; i++) {
      const stub = getRandomPuzzleStub("el", excluded);
      expect(stub.id).not.toBe(excluded);
      expect(FULL.some((p) => p.id === stub.id)).toBe(true);
    }
  });
});
