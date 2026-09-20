// answerPools.test.ts — the Leksiarxeio-owned daily-answer pick, and the same-day
// fallback seam that derived games (Leksodromia, Leksoplegma) consume instead of
// re-deriving it themselves. The oracle re-imports the pools and the rotation
// math directly so the test verifies the module against the rule, not itself.
//
// The rule has two eras, split at LEKSIARXEIO.CURATED_ROTATION_FROM, and the
// expensive half of this file guards the OLD one: the pools are frequency-ordered
// and the pre-cutover pick is `pool[dateToIndex]`, whose modulus is the pool
// length — so deleting one word from a pool re-dates every past answer (measured:
// 590 of 628 days when 267 words were cut). Players' stored rounds are keyed on
// the date, so that is a silent data-corrupting edit that nothing else would
// catch. Hence: exclusions live in answers-excluded.json and are applied at pick
// time, never by deleting from a pool, and the first test below is what stops the
// next session from "tidying" a pool instead.

import { describe, expect, it } from "vitest";

import { LEKSIARXEIO } from "@/config/gameRules";
import { dateToHashIndex, dateToIndex } from "@/lib/puzzleRotation";
import {
  LEKSIARXEIO_ANSWER_POOLS,
  getExcludedAnswers,
  getSameDayFallbackAnswers,
  pickDailyAnswer,
} from "@/data/leksiarxeio/answerPools";

import answers4 from "@/data/leksiarxeio/answers-4.json";
import answers5 from "@/data/leksiarxeio/answers-5.json";
import answers6 from "@/data/leksiarxeio/answers-6.json";
import answers7 from "@/data/leksiarxeio/answers-7.json";
import answers8 from "@/data/leksiarxeio/answers-8.json";
import excluded from "@/data/leksiarxeio/answers-excluded.json";

const LENGTHS = LEKSIARXEIO.LENGTHS;
const POOLS: Record<number, string[]> = {
  4: answers4 as string[],
  5: answers5 as string[],
  6: answers6 as string[],
  7: answers7 as string[],
  8: answers8 as string[],
};

const CUTOVER = LEKSIARXEIO.CURATED_ROTATION_FROM;
const CURATED = LEKSIARXEIO.CURATED_ROTATION_LENGTHS as readonly number[];

/** n consecutive ISO dates starting at `from`. */
function dateRange(n: number, from: string): string[] {
  const out: string[] = [];
  const start = new Date(from).getTime();
  for (let i = 0; i < n; i++) {
    out.push(new Date(start + i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

/** The rule, spelled out independently of the implementation. */
function expectedAnswer(date: string, length: number): string {
  const pool = POOLS[length];
  if (date < CUTOVER || !CURATED.includes(length)) {
    return pool[dateToIndex(date, pool.length)];
  }
  const excluded = getExcludedAnswers(length as 4);
  const playable = pool.filter((word) => !excluded.has(word));
  return playable[dateToHashIndex(date, playable.length, String(length))];
}

describe("LEKSIARXEIO_ANSWER_POOLS", () => {
  it("exposes each length's FULL pool, exclusions included", () => {
    // Not a tautology: it pins that exclusion never happens by deletion. See the
    // header — a shortened pool re-dates history.
    expect(LEKSIARXEIO_ANSWER_POOLS[4]).toEqual(answers4);
    expect(LEKSIARXEIO_ANSWER_POOLS[8]).toEqual(answers8);

    for (const length of CURATED) {
      for (const word of getExcludedAnswers(length as 4)) {
        expect(POOLS[length]).toContain(word);
      }
    }
  });
});

describe("answers-excluded.json", () => {
  it("names a reason for every word, with no word under two reasons", () => {
    // The reason grouping is the file's whole value over a flat list: it is what
    // stops a later session re-litigating each word one at a time.
    const byReason = (excluded as Record<string, Record<string, string[]>>)["4"];
    expect(Object.keys(byReason).length).toBeGreaterThan(0);

    const seen = new Set<string>();
    for (const [reason, words] of Object.entries(byReason)) {
      expect(reason).toMatch(/^[a-z-]+$/);
      expect(words.length).toBeGreaterThan(0);
      for (const word of words) {
        expect(seen.has(word)).toBe(false);
        seen.add(word);
      }
    }
    expect(seen.size).toBe(getExcludedAnswers(4).size);
  });

  it("leaves a pool big enough that a repeat is rare", () => {
    // Repeats before exhaustion are accepted (2026-09-21), but the pool must not
    // be cut so far that the game starts feeling like a loop.
    const excludedFour = getExcludedAnswers(4);
    const playable = POOLS[4].filter((word) => !excludedFour.has(word));
    expect(playable.length).toBeGreaterThan(500);
  });
});

describe("pickDailyAnswer", () => {
  it("serves the pre-cutover walk unchanged for every day since the epoch", () => {
    // The history guard. Epoch is 2025-01-01; this covers every date the game has
    // ever served up to the cutover, at every length.
    const days = Math.round(
      (new Date(CUTOVER).getTime() - new Date("2025-01-01").getTime()) / 86_400_000,
    );
    for (const date of dateRange(days, "2025-01-01")) {
      for (const length of LENGTHS) {
        const pool = POOLS[length];
        expect(pickDailyAnswer(date, length)).toBe(pool[dateToIndex(date, pool.length)]);
      }
    }
  });

  it("never serves an excluded word on or after the cutover", () => {
    for (const date of dateRange(1000, CUTOVER)) {
      for (const length of CURATED) {
        expect(getExcludedAnswers(length as 4).has(pickDailyAnswer(date, length as 4))).toBe(false);
      }
    }
  });

  it("leaves unaudited lengths on the old walk after the cutover", () => {
    for (const date of dateRange(200, CUTOVER)) {
      for (const length of LENGTHS.filter((l) => !CURATED.includes(l))) {
        const pool = POOLS[length];
        expect(pickDailyAnswer(date, length)).toBe(pool[dateToIndex(date, pool.length)]);
      }
    }
  });

  it("is stable across repeat calls and differs between neighbouring days", () => {
    const [a, b] = dateRange(2, CUTOVER);
    expect(pickDailyAnswer(a, 4)).toBe(pickDailyAnswer(a, 4));
    expect(pickDailyAnswer(a, 4)).not.toBe(pickDailyAnswer(b, 4));
  });
});

describe("getSameDayFallbackAnswers", () => {
  it("matches pickDailyAnswer for every length across the cutover boundary", () => {
    for (const date of dateRange(400, "2026-06-01")) {
      const expected = new Set(LENGTHS.map((length) => expectedAnswer(date, length)));
      expect(getSameDayFallbackAnswers(date)).toEqual(expected);
    }
  });

  it("holds one answer per length (deduped to a set)", () => {
    // Distinct lengths → distinct words, so the set has 5 members every day.
    expect(getSameDayFallbackAnswers("2026-07-14").size).toBe(LENGTHS.length);
  });
});
