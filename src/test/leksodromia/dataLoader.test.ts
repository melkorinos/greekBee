// dataLoader.test.ts — getTodaysLeksodromiaPuzzle.
// Binds selectDailyWords + scrambleWord to the real Leksiarxeio answer pools
// (read-only reuse — the loader must never import the MB-scale words-*.json).

import { describe, expect, it } from "vitest";

import { getAnswerPool } from "@/data/leksiarxeio";
import { getTodaysLeksodromiaPuzzle } from "@/data/leksodromia";

const sortLetters = (w: string) => [...w].sort().join("");

describe("getTodaysLeksodromiaPuzzle", () => {
  it("returns the date, 10 ascending words, and a parallel scramble list", () => {
    const puzzle = getTodaysLeksodromiaPuzzle("2026-07-13");
    expect(puzzle.date).toBe("2026-07-13");
    expect(puzzle.words.map((w) => w.length)).toEqual([4, 4, 5, 5, 6, 6, 7, 7, 8, 8]);
    expect(puzzle.scrambles).toHaveLength(10);
  });

  it("each scramble matches its word's letters but never its order", () => {
    const { words, scrambles } = getTodaysLeksodromiaPuzzle("2026-07-13");
    words.forEach((word, i) => {
      expect(sortLetters(scrambles[i])).toBe(sortLetters(word));
      expect(scrambles[i]).not.toBe(word);
    });
  });

  it("is deterministic for a date and draws from the curated pools", () => {
    const a = getTodaysLeksodromiaPuzzle("2026-03-01");
    const b = getTodaysLeksodromiaPuzzle("2026-03-01");
    expect(a).toEqual(b);
    for (const word of a.words) {
      expect(getAnswerPool(word.length as 4 | 5 | 6 | 7 | 8)).toContain(word);
    }
  });
});
