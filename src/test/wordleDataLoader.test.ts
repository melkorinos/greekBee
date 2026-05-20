// Tests for the Wordle data loader.
// Verifies: daily answer is in the word list, determinism, and multi-length support.

import {
  WORDLE_LENGTHS,
  getAllTodaysWordlePuzzles,
  getTodayDateString,
  getTodaysWordlePuzzle,
  getValidWords,
} from "@/data/wordle";
import { describe, expect, it } from "vitest";

describe("getTodaysWordlePuzzle", () => {
  it("returns a puzzle with the correct length", () => {
    const p = getTodaysWordlePuzzle("2026-01-01", 5);
    expect(p.answer).toHaveLength(5);
    expect(p.length).toBe(5);
  });

  it("answer is in the valid-words list", () => {
    const words  = getValidWords(5);
    const puzzle = getTodaysWordlePuzzle("2026-01-01", 5);
    expect(words).toContain(puzzle.answer);
  });

  it("is deterministic — same date always returns the same answer", () => {
    const a = getTodaysWordlePuzzle("2026-05-12", 5);
    const b = getTodaysWordlePuzzle("2026-05-12", 5);
    expect(a.answer).toBe(b.answer);
    expect(a.id).toBe(b.id);
  });

  it("returns a different answer on a different date", () => {
    const a = getTodaysWordlePuzzle("2026-01-01", 5);
    const b = getTodaysWordlePuzzle("2026-01-02", 5);
    expect(a.id).not.toBe(b.id);
  });

  it("puzzle id encodes the date and length", () => {
    const p = getTodaysWordlePuzzle("2026-03-15", 5);
    expect(p.id).toBe("2026-03-15-wordle-5");
    expect(p.date).toBe("2026-03-15");
  });

  it("defaults to length 4", () => {
    const p = getTodaysWordlePuzzle("2026-01-01");
    expect(p.length).toBe(4);
    expect(p.answer).toHaveLength(4);
  });
});

describe("getAllTodaysWordlePuzzles", () => {
  it("returns 5 puzzles (lengths 4–8)", () => {
    const puzzles = getAllTodaysWordlePuzzles("2026-01-01");
    expect(puzzles).toHaveLength(5);
    expect(puzzles.map((p) => p.length)).toEqual([4, 5, 6, 7, 8]);
  });

  it("each puzzle answer matches its declared length", () => {
    const puzzles = getAllTodaysWordlePuzzles("2026-01-01");
    for (const p of puzzles) {
      expect(p.answer).toHaveLength(p.length);
    }
  });
});

describe("getValidWords", () => {
  it("returns non-empty arrays for all supported lengths", () => {
    for (const len of WORDLE_LENGTHS) {
      expect(getValidWords(len).length).toBeGreaterThan(0);
    }
  });

  it("all words in each list match the declared length", () => {
    for (const len of WORDLE_LENGTHS) {
      const words = getValidWords(len);
      expect(words.every((w) => w.length === len)).toBe(true);
    }
  });

  it("all words are lowercase with no accents", () => {
    for (const len of WORDLE_LENGTHS) {
      const words = getValidWords(len);
      expect(
        words.every((w) => w === w.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
      ).toBe(true);
    }
  });
});

describe("getTodayDateString", () => {
  it("returns a valid ISO date string", () => {
    const d = getTodayDateString();
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

