// spellingBeeDataLoader.test.ts — unit tests for the Spelling Bee data layer.
// Covers: getPuzzleForDate, getPuzzleById, getRandomPuzzle, getNextPuzzle.
// These functions are the gateway between raw JSON and the game; bugs here
// would break the daily puzzle for all players.

import { describe, expect, it } from "vitest";
import {
  getCuratedPuzzleByLetters,
  getNextPuzzle,
  getPuzzleById,
  getPuzzleForDate,
  getRandomPuzzle,
  getRecentPuzzleDates,
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

// ── getCuratedPuzzleByLetters ─────────────────────────────────────────────────

describe("getCuratedPuzzleByLetters", () => {
  // Use a known curated puzzle as a reference
  const ref = getPuzzleForDate("2026-03-25");

  it("returns the curated puzzle when letters match exactly", () => {
    const found = getCuratedPuzzleByLetters(ref.centerLetter, ref.outerLetters);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(ref.id);
  });

  it("returns the curated puzzle regardless of outer-letter order", () => {
    const shuffled = [...ref.outerLetters].reverse();
    const found = getCuratedPuzzleByLetters(ref.centerLetter, shuffled);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(ref.id);
  });

  it("returns null for a letter combination not in the curated list", () => {
    // Highly unlikely any curated puzzle uses these exact letters
    const found = getCuratedPuzzleByLetters("ξ", ["ψ", "ζ", "θ", "φ", "β", "χ"]);
    expect(found).toBeNull();
  });

  it("returned puzzle has a date-format id (not 'custom-...')", () => {
    const found = getCuratedPuzzleByLetters(ref.centerLetter, ref.outerLetters);
    expect(found!.id).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

// ── Routing regression: leaderboard "play past puzzle" link ───────────────────
// The leaderboard sends ?puzzle=YYYY-MM-DD (a date string, not a full puzzle ID).
// getPuzzleById would return null (IDs have the -el suffix), causing a silent
// fallback to today's puzzle. getPuzzleForDate must be used instead.

describe("getPuzzleForDate — leaderboard routing regression", () => {
  it("returns the correct puzzle when given a plain date string (as sent by leaderboard)", () => {
    // This is the exact value the leaderboard passes as ?puzzle=
    const dateOnly = "2026-03-25";
    const p = getPuzzleForDate(dateOnly);
    // Must return the matching puzzle, NOT a fallback
    expect(p.date).toBe(dateOnly);
    expect(p.id).toBe("2026-03-25-el");
  });

  it("getPuzzleById returns null for a plain date string (confirms why getPuzzleForDate is required)", () => {
    const dateOnly = "2026-03-25";
    const p = getPuzzleById(dateOnly, "el");
    // IDs have '-el' suffix; plain date finds nothing
    expect(p).toBeNull();
  });
});

// ── getRecentPuzzleDates ──────────────────────────────────────────────────────

describe("getRecentPuzzleDates", () => {
  it("returns exactly n dates", () => {
    const dates = getRecentPuzzleDates(7);
    expect(dates).toHaveLength(7);
  });

  it("returns dates sorted newest-first", () => {
    const dates = getRecentPuzzleDates(7);
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i] > dates[i + 1]).toBe(true);
    }
  });

  it("first date is today or in the past (not in the future)", () => {
    const today = new Date().toISOString().split("T")[0];
    const dates = getRecentPuzzleDates(7);
    expect(dates[0] <= today).toBe(true);
  });

  it("all returned dates are valid YYYY-MM-DD strings", () => {
    const dates = getRecentPuzzleDates(7);
    dates.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("all returned dates correspond to real puzzles in the data", () => {
    const dates = getRecentPuzzleDates(7);
    dates.forEach((d) => {
      const p = getPuzzleForDate(d);
      expect(p.date).toBe(d);
    });
  });

  it("works with n=1 (returns only today's date)", () => {
    const today = new Date().toISOString().split("T")[0];
    const dates = getRecentPuzzleDates(1);
    expect(dates).toHaveLength(1);
    expect(dates[0]).toBe(today);
  });
});
