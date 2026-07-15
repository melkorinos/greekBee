// dataLoader.test.ts — getTodaysLeksodromiaPuzzle.
// Binds selectDailyWords + scrambleWord to the real Leksiarxeio answer pools
// (read-only reuse — the loader must never import the MB-scale words-*.json).
// The cross-game leak invariant now lives at THIS seam: the loader injects
// getSameDayFallbackAnswers into the pure selector, so the end-to-end guard is
// verified here rather than inside selectDailyWords.

import { describe, expect, it } from "vitest";

import { dateToIndex } from "@/lib/puzzleRotation";
import { getAnswerPool } from "@/data/leksiarxeio";
import { getTodaysLeksodromiaPuzzle } from "@/data/leksodromia";

const sortLetters = (w: string) => [...w].sort().join("");

/** n consecutive ISO dates starting at 2026-01-01. */
function dateRange(n: number): string[] {
  const out: string[] = [];
  const start = new Date("2026-01-01").getTime();
  for (let i = 0; i < n; i++) {
    out.push(new Date(start + i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

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

  it("lists accepted inputs per word: the answer first, plus valid same-letter anagrams", () => {
    const { words, accepted } = getTodaysLeksodromiaPuzzle("2026-07-13");
    expect(accepted).toHaveLength(words.length);
    words.forEach((word, i) => {
      // The canonical answer is always accepted, and always first.
      expect(accepted[i][0]).toBe(word);
      // Every accepted alternate is a true anagram of the answer (same rack).
      for (const alt of accepted[i]) {
        expect(sortLetters(alt)).toBe(sortLetters(word));
      }
    });
  });

  it("never surfaces a same-day Leksiarxeio fallback answer, all year (cross-game leak)", () => {
    for (const date of dateRange(365)) {
      const { words } = getTodaysLeksodromiaPuzzle(date);
      for (const len of [4, 5, 6, 7, 8] as const) {
        const pool = getAnswerPool(len);
        const leksiarxeioAnswer = pool[dateToIndex(date, pool.length)];
        expect(words, `${date}: leaked ${leksiarxeioAnswer}`).not.toContain(leksiarxeioAnswer);
      }
    }
  });
});
