// Leksoplegma data loader — deterministic daily rotation over the committed
// batch + the cross-game guard: today's puzzle must never contain (as a
// required word) any of Leksiarxeio's same-day fallback answers, since the
// end-of-round recap reveals all required words.

import { describe, it, expect } from "vitest";

import { LEKSOPLEGMA } from "@/config/gameRules";
import {
  getPuzzleForDate,
  getTodayDateString,
  containsSameDayLeksiarxeioAnswer,
} from "@/data/leksoplegma";
import { dateToIndex } from "@/lib/puzzleRotation";

import answers4 from "@/data/leksiarxeio/answers-4.json";
import answers5 from "@/data/leksiarxeio/answers-5.json";
import answers6 from "@/data/leksiarxeio/answers-6.json";
import answers7 from "@/data/leksiarxeio/answers-7.json";
import answers8 from "@/data/leksiarxeio/answers-8.json";

const POOLS = [answers4, answers5, answers6, answers7, answers8] as string[][];

/** Leksiarxeio's same-day static fallback answers, one per length. */
function leksiarxeioAnswersFor(date: string): string[] {
  return POOLS.map((pool) => pool[dateToIndex(date, pool.length)]);
}

function datesOfYear(year: number): string[] {
  const dates: string[] = [];
  for (let d = new Date(`${year}-01-01`); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

describe("getPuzzleForDate", () => {
  it("returns the same well-formed puzzle for the same date", () => {
    const a = getPuzzleForDate("2026-07-14");
    const b = getPuzzleForDate("2026-07-14");
    expect(a).toEqual(b);
    expect(a.letters).toHaveLength(LEKSOPLEGMA.GRID_SIZE);
    expect(Object.keys(a.paths)).toHaveLength(LEKSOPLEGMA.REQUIRED_WORDS);
  });

  it("rotates: nearby dates serve different puzzles", () => {
    expect(getPuzzleForDate("2026-07-14").id).not.toBe(getPuzzleForDate("2026-07-15").id);
  });

  it("never serves a puzzle containing a same-day Leksiarxeio answer, all year", () => {
    for (const date of datesOfYear(2026)) {
      const required = new Set(Object.keys(getPuzzleForDate(date).paths));
      for (const answer of leksiarxeioAnswersFor(date)) {
        expect(required.has(answer), `${date}: leaked ${answer}`).toBe(false);
      }
    }
  });
});

describe("containsSameDayLeksiarxeioAnswer", () => {
  it("detects a required-word collision with that day's fallback answers", () => {
    const date = "2026-07-14";
    const answer = leksiarxeioAnswersFor(date)[1]; // the 5-letter answer
    const fake = {
      id: "fixture",
      letters: "α".repeat(16),
      paths: { [answer]: [0, 1, 2, 3, 4] },
      bonusWords: [],
    };
    expect(containsSameDayLeksiarxeioAnswer(fake, date)).toBe(true);
  });

  it("passes a puzzle with no collision", () => {
    const fake = {
      id: "fixture",
      letters: "α".repeat(16),
      paths: { ζζζζζ: [0, 1, 2, 3, 4] },
      bonusWords: [],
    };
    expect(containsSameDayLeksiarxeioAnswer(fake, "2026-07-14")).toBe(false);
  });
});

describe("getTodayDateString", () => {
  it("returns an ISO date", () => {
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
