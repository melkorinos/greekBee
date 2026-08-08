// Corpus guards for the shipped Leksokipos daily puzzles.
//
// Two independent invariants, both established by the 2026-07-30 difficulty
// rebalance and both easy to reintroduce by accident:
//
//   1. QUALITY — every committed puzzle clears the generation-time gates
//      (MAX_PANGRAMS, MAX_WORDS_TO_GENIUS). The generators enforce these at
//      creation, but a dictionary re-sync can push a board past a gate long
//      after it was generated, so this is the backstop.
//
//   2. DATE INTEGRITY — dates are unique, strictly consecutive, and each id
//      matches its date. This one is load-bearing in a way that is NOT obvious:
//      getPuzzleForDate() and getPuzzleStubForDate() both fall back to the LAST
//      puzzle in the array when no date matches. A single missing day therefore
//      does not throw — it silently serves the final 2028 puzzle to everyone.
//      Only this test can catch that.

import { describe, expect, it } from "vitest";

import { LEKSOKIPOS } from "@/config/gameRules";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import puzzles from "@/data/leksokipos/puzzles-el.json";
import {
  countPangrams,
  meetsDifficultyRules,
  realisticWordsToGenius,
} from "../../../scripts/lib/leksokipos/puzzleQuality";

const list = puzzles as LeksokiposPuzzle[];

/** Advances an ISO date by one day, UTC-safe (no local-timezone drift). */
function nextISODate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

describe("shipped puzzle corpus meets the quality gates", () => {
  it("has no puzzle at or above the pangram ceiling", () => {
    const offenders = list
      .filter((p) => countPangrams(p) >= LEKSOKIPOS.MAX_PANGRAMS)
      .map((p) => `${p.date} (${countPangrams(p)} pangrams)`);

    expect(offenders).toEqual([]);
  });

  it("has no puzzle at or above the tedium ceiling", () => {
    const offenders = list
      .filter((p) => realisticWordsToGenius(p) >= LEKSOKIPOS.MAX_WORDS_TO_GENIUS)
      .map((p) => `${p.date} (${realisticWordsToGenius(p)} words to genius)`);

    expect(offenders).toEqual([]);
  });

  it("passes the combined gate for every puzzle", () => {
    expect(list.filter((p) => !meetsDifficultyRules(p)).map((p) => p.date)).toEqual([]);
  });
});

describe("shipped puzzle corpus has intact date keying", () => {
  it("is non-empty", () => {
    expect(list.length).toBeGreaterThan(0);
  });

  it("has no duplicate dates", () => {
    const seen = new Set<string>();
    const duplicates = list.filter((p) => (seen.has(p.date) ? true : (seen.add(p.date), false)));

    expect(duplicates.map((p) => p.date)).toEqual([]);
  });

  it("has strictly consecutive dates with no gaps", () => {
    // A gap is invisible at runtime — the date-miss fallback serves the last
    // puzzle in the array instead of throwing. See the header note.
    const gaps: string[] = [];
    for (let i = 1; i < list.length; i++) {
      const expected = nextISODate(list[i - 1].date);
      if (list[i].date !== expected) {
        gaps.push(`after ${list[i - 1].date}: expected ${expected}, got ${list[i].date}`);
      }
    }

    expect(gaps).toEqual([]);
  });

  it("gives every puzzle an id matching its own date", () => {
    const mismatched = list
      .filter((p) => p.id !== `${p.date}-el`)
      .map((p) => `${p.id} != ${p.date}-el`);

    expect(mismatched).toEqual([]);
  });
});
