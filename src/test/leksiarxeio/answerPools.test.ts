// answerPools.test.ts — the Leksiarxeio-owned same-day fallback-answer seam that
// derived games (Leksodromia, Leksoplegma) consume instead of re-deriving
// pool[dateToIndex] themselves. The oracle re-imports the pools directly so the
// test verifies the module against the math, not against itself.

import { describe, expect, it } from "vitest";

import { dateToIndex } from "@/lib/puzzleRotation";
import {
  LEKSIARXEIO_ANSWER_POOLS,
  getSameDayFallbackAnswers,
} from "@/data/leksiarxeio/answerPools";

import answers4 from "@/data/leksiarxeio/answers-4.json";
import answers5 from "@/data/leksiarxeio/answers-5.json";
import answers6 from "@/data/leksiarxeio/answers-6.json";
import answers7 from "@/data/leksiarxeio/answers-7.json";
import answers8 from "@/data/leksiarxeio/answers-8.json";

const POOLS = [answers4, answers5, answers6, answers7, answers8] as string[][];

/** n consecutive ISO dates starting at 2026-01-01. */
function dateRange(n: number): string[] {
  const out: string[] = [];
  const start = new Date("2026-01-01").getTime();
  for (let i = 0; i < n; i++) {
    out.push(new Date(start + i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

describe("LEKSIARXEIO_ANSWER_POOLS", () => {
  it("exposes each length's pool matching the raw JSON", () => {
    expect(LEKSIARXEIO_ANSWER_POOLS[4]).toEqual(answers4);
    expect(LEKSIARXEIO_ANSWER_POOLS[8]).toEqual(answers8);
  });
});

describe("getSameDayFallbackAnswers", () => {
  it("returns exactly Leksiarxeio's pool[dateToIndex] answer for every length, all year", () => {
    for (const date of dateRange(365)) {
      const expected = new Set(POOLS.map((pool) => pool[dateToIndex(date, pool.length)]));
      const actual = getSameDayFallbackAnswers(date);
      expect(actual).toEqual(expected);
    }
  });

  it("holds one answer per length (deduped to a set)", () => {
    // Distinct lengths → distinct words, so the set has 5 members every day.
    expect(getSameDayFallbackAnswers("2026-07-14").size).toBe(POOLS.length);
  });
});
