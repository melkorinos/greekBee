// selectDailyWords.test.ts — deterministic daily word selection for Leksodromia.
// 10 words per puzzle: 2 distinct per length 4–8, ascending. Same result for
// every player on a date (fair leaderboard). Invariant: never selects
// Leksiarxeio's same-day fallback answer (pool[dateToIndex(date, pool.length)])
// — a player could otherwise learn another game's answer here.

import { describe, expect, it } from "vitest";

import { LEKSODROMIA } from "@/config/gameRules";
import type { LeksodromiaLength } from "@/games/leksodromia/types";
import { dateToIndex } from "@/lib/puzzleRotation";
import { getAnswerPool } from "@/data/leksiarxeio";
import { selectDailyWords } from "@/games/leksodromia/lib/selectDailyWords";

// Small fixture pools — precise control over the forbidden-index invariant.
const FIXTURE_POOLS: Record<LeksodromiaLength, readonly string[]> = {
  4: ["αυγο", "βημα", "γατα", "δεμα", "ζωνη"],
  5: ["αγορα", "βαρκα", "γωνια", "δωρον", "ελατο"],
  6: ["αγκυρα", "βαλιτσ", "γραμμα", "δασκος", "ελαφρο"],
  7: ["αγγελος", "βαθμιδα", "γεματος", "δικτατο", "εκκλησι"],
  8: ["αγκαλιες", "βαρκαρης", "γραμματα", "δικαστης", "ελευθερο"],
};

const REAL_POOLS: Record<LeksodromiaLength, readonly string[]> = {
  4: getAnswerPool(4),
  5: getAnswerPool(5),
  6: getAnswerPool(6),
  7: getAnswerPool(7),
  8: getAnswerPool(8),
};

/**
 * The forbidden set the loader injects, re-derived here independently as the test
 * oracle: one same-day answer per pool (pool[dateToIndex]). Kept local so the test
 * verifies selectDailyWords against the math rather than against production code.
 */
function forbiddenFor(pools: Record<LeksodromiaLength, readonly string[]>, date: string): Set<string> {
  return new Set(
    LEKSODROMIA.LENGTHS.map((len) => {
      const pool = pools[len];
      return pool[dateToIndex(date, pool.length)];
    }),
  );
}

/** n consecutive ISO dates starting at 2026-01-01. */
function dateRange(n: number): string[] {
  const out: string[] = [];
  const start = new Date("2026-01-01").getTime();
  for (let i = 0; i < n; i++) {
    out.push(new Date(start + i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

describe("selectDailyWords", () => {
  it("is deterministic — same date, same 10 words in the same order", () => {
    const a = selectDailyWords("2026-07-13", REAL_POOLS, forbiddenFor(REAL_POOLS, "2026-07-13"));
    const b = selectDailyWords("2026-07-13", REAL_POOLS, forbiddenFor(REAL_POOLS, "2026-07-13"));
    expect(a).toEqual(b);
  });

  it("returns 2 words per length, ascending 4→8", () => {
    const words = selectDailyWords("2026-07-13", REAL_POOLS, forbiddenFor(REAL_POOLS, "2026-07-13"));
    expect(words.map((w) => w.length)).toEqual([4, 4, 5, 5, 6, 6, 7, 7, 8, 8]);
    expect(words).toHaveLength(
      LEKSODROMIA.LENGTHS.length * LEKSODROMIA.WORDS_PER_LENGTH,
    );
  });

  it("the two words of each length are distinct and drawn from that length's pool", () => {
    for (const date of dateRange(30)) {
      const words = selectDailyWords(date, REAL_POOLS, forbiddenFor(REAL_POOLS, date));
      for (const len of LEKSODROMIA.LENGTHS) {
        const pair = words.filter((w) => w.length === len);
        expect(pair[0]).not.toBe(pair[1]);
        expect(REAL_POOLS[len]).toContain(pair[0]);
        expect(REAL_POOLS[len]).toContain(pair[1]);
      }
    }
  });

  it("never selects a forbidden answer (cross-game leak)", () => {
    for (const date of dateRange(365)) {
      const forbidden = forbiddenFor(REAL_POOLS, date);
      const words = selectDailyWords(date, REAL_POOLS, forbidden);
      for (const answer of forbidden) {
        expect(words).not.toContain(answer);
      }
    }
  });

  it("avoids the forbidden answer even in a tiny pool where random picks would hit it", () => {
    // With 5-word pools and 60 dates, an unguarded picker would collide.
    for (const date of dateRange(60)) {
      const forbidden = forbiddenFor(FIXTURE_POOLS, date);
      const words = selectDailyWords(date, FIXTURE_POOLS, forbidden);
      for (const answer of forbidden) {
        expect(words).not.toContain(answer);
      }
    }
  });

  it("varies across dates — not the same puzzle every day", () => {
    const distinct = new Set(
      dateRange(30).map((d) => selectDailyWords(d, REAL_POOLS, forbiddenFor(REAL_POOLS, d)).join(",")),
    );
    expect(distinct.size).toBeGreaterThan(1);
  });
});
