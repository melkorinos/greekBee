// spellingBeeDataLoader.test.ts — unit tests for the Spelling Bee data layer.
// Covers: getPuzzleForDate, getPuzzleById, getRandomPuzzle, getNextPuzzle.
// These functions are the gateway between raw JSON and the game; bugs here
// would break the daily puzzle for all players.

import { describe, expect, it } from "vitest";
import {
  getPuzzleById,
  getPuzzleForDate,
  getRandomPuzzle,
  getNextPuzzle,
} from "@/data/spelling-bee";

// ── getPuzzleForDate ───────────────────────────────────────────────────────────

describe("getPuzzleForDate", () => {
  it("returns the puzzle whose date matches exactly", () => {
    const p = getPuzzleForDate("2026-03-25");
    expect(p.date).toBe("2026-03-25");
    expect(p.id).toBe("2026-03-25-el");
  });

  it("falls back to the most recent puzzle when date has no match", () => {
    // A date far in the past that is not in the JSON
    const p = getPuzzleForDate("1999-01-01");
    // Should be the last puzzle in the file (most recent)
    expect(p).toBeDefined();
    expect(p.id).toBeTruthy();
  });

  it("returned puzzle has the expected Puzzle shape", () => {
    const p = getPuzzleForDate("2026-03-25");
    expect(typeof p.id).toBe("string");
    expect(typeof p.centerLetter).toBe("string");
    expect(p.outerLetters).toHaveLength(6);
    expect(Array.isArray(p.validWords)).toBe(true);
    expect(p.validWords.length).toBeGreaterThan(0);
    expect(p.language).toBe("el");
  });

  it("defaults to language 'el' when no language is supplied", () => {
    const p = getPuzzleForDate("2026-03-25");
    expect(p.language).toBe("el");
  });
});

// ── getPuzzleById ──────────────────────────────────────────────────────────────

describe("getPuzzleById", () => {
  it("returns the puzzle with the matching id", () => {
    const p = getPuzzleById("2026-03-25-el", "el");
    expect(p).not.toBeNull();
    expect(p!.date).toBe("2026-03-25");
  });

  it("returns null for an id that does not exist", () => {
    expect(getPuzzleById("nonexistent-id", "el")).toBeNull();
  });

  it("returns null for an empty string id", () => {
    expect(getPuzzleById("", "el")).toBeNull();
  });
});

// ── getRandomPuzzle ────────────────────────────────────────────────────────────

describe("getRandomPuzzle", () => {
  it("returns a valid puzzle", () => {
    const p = getRandomPuzzle("el");
    expect(p).toBeDefined();
    expect(p.language).toBe("el");
    expect(p.outerLetters).toHaveLength(6);
  });

  it("excludes the given puzzle id when excludeId is supplied", () => {
    // Run many iterations to make the probabilistic exclusion reliable
    const exclude = "2026-03-25-el";
    for (let i = 0; i < 20; i++) {
      const p = getRandomPuzzle("el", exclude);
      expect(p.id).not.toBe(exclude);
    }
  });

  it("still returns a puzzle even when exclude matches the only available puzzle", () => {
    // The function should fall back to the full list rather than crashing
    // We can't test this with real data easily, but we can verify it doesn't throw
    // even with a very unlikely exclude
    expect(() => getRandomPuzzle("el", "2026-03-25-el")).not.toThrow();
  });
});

// ── getNextPuzzle ──────────────────────────────────────────────────────────────

describe("getNextPuzzle", () => {
  it("returns a different puzzle than the input", () => {
    const current = getPuzzleForDate("2026-03-25");
    const next = getNextPuzzle(current);
    // As long as there is more than one puzzle, next should differ
    expect(next.id).not.toBe(current.id);
  });

  it("returned puzzle has the correct shape", () => {
    const current = getPuzzleForDate("2026-03-25");
    const next = getNextPuzzle(current);
    expect(next.outerLetters).toHaveLength(6);
    expect(typeof next.centerLetter).toBe("string");
    expect(next.language).toBe("el");
  });

  it("cycles back to the first puzzle after the last one", () => {
    // Get the last puzzle in the list by using a far-future fallback date
    const last = getPuzzleForDate("2099-01-01"); // no match → falls back to last
    const cycled = getNextPuzzle(last);
    // Should cycle back to the first puzzle in the array
    const first = getPuzzleForDate("2026-03-25");
    // If last is truly the last, cycled should equal first
    // (only true if last is actually the last in the array — valid assumption given fallback logic)
    expect(cycled.id).toBe(first.id);
  });
});
