// leksokiposDataLoader.test.ts — unit tests for the Leksokipos data layer.
// Covers: getPuzzleForDate, getPuzzleById, getRandomPuzzle, getNextPuzzle.
// These functions are the gateway between raw JSON and the game; bugs here
// would break the daily puzzle for all players.

import { describe, expect, it } from "vitest";
import {
  getPrebuiltPuzzleByLetters,
  getNextPuzzle,
  getPuzzleById,
  getPuzzleForDate,
  getRandomPuzzle,
} from "@/data/leksokipos";
import puzzlesEl from "@/data/leksokipos/puzzles-el.json";
import { getLast7Dates, todayISO } from "@/lib/puzzleDate";

// ── getPuzzleForDate ───────────────────────────────────────────────────────────

describe("getPuzzleForDate", () => {
  it("returns the puzzle whose date matches exactly", () => {
    const p = getPuzzleForDate("2026-03-25");
    expect(p.date).toBe("2026-03-25");
    expect(p.id).toBe("2026-03-25-el");
  });

  it("falls back to a rotation when the date has no match", () => {
    // A date far in the past that is not in the JSON.
    const p = getPuzzleForDate("1999-01-01");
    expect(p).toBeDefined();
    expect(p.id).toBeTruthy();
  });

  it("does not serve the furthest-future board once the calendar runs out", () => {
    // The old miss rule returned puzzles[length - 1], so every date past the
    // last authored day served the same 2028 board forever. Full invariant and
    // its sweep across all Games: src/test/shared/dailyPuzzleSelection.test.ts.
    const last = puzzlesEl[puzzlesEl.length - 1];
    const beyond = ["2030-01-01", "2030-01-02", "2030-01-03"].map((d) => getPuzzleForDate(d));

    expect(beyond.map((p) => p.id)).not.toContain(last.id);
    expect(new Set(beyond.map((p) => p.id)).size).toBeGreaterThan(1);
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
    // Taken from the JSON directly: a far-future date no longer resolves to the
    // last board (getPuzzleForDate rotates on a miss rather than pinning it).
    const last = getPuzzleForDate(puzzlesEl[puzzlesEl.length - 1].date);
    const cycled = getNextPuzzle(last);
    const first = getPuzzleForDate(puzzlesEl[0].date);

    expect(cycled.id).toBe(first.id);
  });
});

// ── getPrebuiltPuzzleByLetters ────────────────────────────────────────────────

describe("getPrebuiltPuzzleByLetters", () => {
  // Use a known pre-built puzzle as a reference
  const ref = getPuzzleForDate("2026-03-25");

  it("returns the pre-built puzzle when letters match exactly", () => {
    const found = getPrebuiltPuzzleByLetters(ref.centerLetter, ref.outerLetters);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(ref.id);
  });

  it("returns the pre-built puzzle regardless of outer-letter order", () => {
    const shuffled = [...ref.outerLetters].reverse();
    const found = getPrebuiltPuzzleByLetters(ref.centerLetter, shuffled);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(ref.id);
  });

  it("returns null for a letter combination not in the pre-built list", () => {
    const found = getPrebuiltPuzzleByLetters("ξ", ["ψ", "ζ", "θ", "φ", "β", "χ"]);
    expect(found).toBeNull();
  });

  it("returned puzzle has a date-format id (not 'custom-...')", () => {
    const found = getPrebuiltPuzzleByLetters(ref.centerLetter, ref.outerLetters);
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

// ── Puzzle-set density ────────────────────────────────────────────────────────

// The leaderboard strip is derived from the calendar (getLast7Dates), not from
// the puzzle JSON. That is only equivalent while the puzzle set has no calendar
// gaps — a gap would render a pill for a puzzle that doesn't exist.
describe("puzzle set density", () => {
  it("has a puzzle for every calendar day in its range, with no gaps or dupes", () => {
    const dates = puzzlesEl.map((p) => p.date);
    const expected: string[] = [];
    const d = new Date(dates[0] + "T00:00:00Z");
    const last = new Date(dates[dates.length - 1] + "T00:00:00Z");
    while (d <= last) {
      expected.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    expect(dates).toEqual(expected);
  });

  it("covers the whole rolling strip back from today", () => {
    getLast7Dates(todayISO()).forEach((date) => {
      expect(getPuzzleForDate(date).date).toBe(date);
    });
  });
});
