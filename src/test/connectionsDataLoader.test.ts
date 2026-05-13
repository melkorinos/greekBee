// connectionsDataLoader.test.ts — unit tests for the Connections data layer.
// Verifies: date matching, fallback behaviour, and puzzle shape contract.

import { describe, expect, it } from "vitest";
import {
  getTodaysConnectionsPuzzle,
  allConnectionsPuzzles,
} from "@/data/connections";

// ── allConnectionsPuzzles ──────────────────────────────────────────────────────

describe("allConnectionsPuzzles", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(allConnectionsPuzzles)).toBe(true);
    expect(allConnectionsPuzzles.length).toBeGreaterThan(0);
  });

  it("every puzzle has exactly 4 groups", () => {
    for (const puzzle of allConnectionsPuzzles) {
      expect(puzzle.groups).toHaveLength(4);
    }
  });

  it("every group has exactly 4 words", () => {
    for (const puzzle of allConnectionsPuzzles) {
      for (const group of puzzle.groups) {
        expect(group.words).toHaveLength(4);
      }
    }
  });

  it("every group has a non-empty category string", () => {
    for (const puzzle of allConnectionsPuzzles) {
      for (const group of puzzle.groups) {
        expect(typeof group.category).toBe("string");
        expect(group.category.length).toBeGreaterThan(0);
      }
    }
  });

  it("every group has a difficulty between 1 and 4", () => {
    for (const puzzle of allConnectionsPuzzles) {
      for (const group of puzzle.groups) {
        expect(group.difficulty).toBeGreaterThanOrEqual(1);
        expect(group.difficulty).toBeLessThanOrEqual(4);
      }
    }
  });
});

// ── getTodaysConnectionsPuzzle ─────────────────────────────────────────────────

describe("getTodaysConnectionsPuzzle", () => {
  const KNOWN_DATE = "2026-05-12";

  it("returns the puzzle whose date matches exactly", () => {
    const p = getTodaysConnectionsPuzzle(KNOWN_DATE);
    expect(p.date).toBe(KNOWN_DATE);
  });

  it("returned puzzle has exactly 4 groups", () => {
    const p = getTodaysConnectionsPuzzle(KNOWN_DATE);
    expect(p.groups).toHaveLength(4);
  });

  it("difficulty values cover all 4 levels (1–4)", () => {
    const p = getTodaysConnectionsPuzzle(KNOWN_DATE);
    const difficulties = p.groups.map((g) => g.difficulty).sort();
    expect(difficulties).toEqual([1, 2, 3, 4]);
  });

  it("falls back to the most recent puzzle for an unscheduled date", () => {
    const p = getTodaysConnectionsPuzzle("1999-01-01");
    expect(p).toBeDefined();
    expect(p.groups).toHaveLength(4);
    // Should be the last puzzle (most recent) in the array
    const last = allConnectionsPuzzles[allConnectionsPuzzles.length - 1];
    expect(p.date).toBe(last.date);
  });

  it("does not throw for a future date with no match", () => {
    expect(() => getTodaysConnectionsPuzzle("2099-12-31")).not.toThrow();
  });

  it("all 16 words across the 4 groups are unique (no duplicate words)", () => {
    const p = getTodaysConnectionsPuzzle(KNOWN_DATE);
    const allWords = p.groups.flatMap((g) => g.words);
    expect(new Set(allWords).size).toBe(16);
  });
});
