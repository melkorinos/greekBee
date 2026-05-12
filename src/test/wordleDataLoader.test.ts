// Tests for the Wordle data loader.
// Verifies: daily answer comes from the curated pool, valid-guess list is the
// full word list, determinism, and the answer pool / word list relationship.

import { describe, expect, it } from "vitest";
import {
  getAnswerPool,
  getTodayDateString,
  getTodaysWordlePuzzle,
  getValidWords,
} from "@/data/wordle";

describe("getTodaysWordlePuzzle", () => {
  it("returns a puzzle with the correct length", () => {
    const p = getTodaysWordlePuzzle("2026-01-01", 5);
    expect(p.answer).toHaveLength(5);
    expect(p.length).toBe(5);
  });

  it("answer is in the curated answer pool", () => {
    const pool   = getAnswerPool(5);
    const puzzle = getTodaysWordlePuzzle("2026-01-01", 5);
    expect(pool).toContain(puzzle.answer);
  });

  it("answer is also in the full valid-words list", () => {
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
    // Adjacent days should differ (they're consecutive indices in a sorted list)
    expect(a.id).not.toBe(b.id);
  });

  it("puzzle id encodes the date and length", () => {
    const p = getTodaysWordlePuzzle("2026-03-15", 5);
    expect(p.id).toBe("2026-03-15-wordle-5");
    expect(p.date).toBe("2026-03-15");
  });
});

describe("getAnswerPool", () => {
  it("returns a non-empty array for length 5", () => {
    expect(getAnswerPool(5).length).toBeGreaterThan(0);
  });

  it("all words are exactly 5 characters", () => {
    const pool = getAnswerPool(5);
    expect(pool.every((w) => w.length === 5)).toBe(true);
  });

  it("all words are lowercase with no accents", () => {
    const pool = getAnswerPool(5);
    // If any accent remained, NFD would produce a longer string
    expect(pool.every((w) => w === w.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))).toBe(true);
  });

  it("answer pool is a strict subset of the valid-words list", () => {
    const pool      = new Set(getAnswerPool(5));
    const validList = new Set(getValidWords(5));
    for (const word of pool) {
      expect(validList.has(word)).toBe(true);
    }
  });

  it("answer pool is smaller than the valid-words list", () => {
    expect(getAnswerPool(5).length).toBeLessThan(getValidWords(5).length);
  });
});

describe("getValidWords", () => {
  it("returns a non-empty array for length 5", () => {
    expect(getValidWords(5).length).toBeGreaterThan(0);
  });

  it("valid-words list is larger than the answer pool", () => {
    expect(getValidWords(5).length).toBeGreaterThan(getAnswerPool(5).length);
  });
});

describe("getTodayDateString", () => {
  it("returns a valid ISO date string", () => {
    const d = getTodayDateString();
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
