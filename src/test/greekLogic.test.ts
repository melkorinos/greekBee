// Greek language tests — proves the same pure logic functions work
// with Greek Unicode letters without any code changes.

import { describe, expect, it } from "vitest";
import { getPuzzleForDate, getTodaysPuzzle } from "@/data";
import { maxScore, scoreWord } from "@/lib/scoring";

import type { Puzzle } from "@/types";
import { isPangram } from "@/lib/pangram";
import { validateWord } from "@/lib/validation";

// ── Greek test puzzle (mirrors puzzles-el.json) ────────────────────────────────

const puzzle: Puzzle = {
  id: "2026-03-25-el",
  language: "el",
  date: "2026-03-25",
  centerLetter: "α",
  outerLetters: ["π", "ο", "λ", "ε", "μ", "σ"],
  // "πολεμας" uses all 7 letters — it is the pangram
  validWords: ["σαλα", "μαλα", "σαλος", "παλμος", "σαλεμα", "πολεμα", "πολεμας"],
};

// ── isPangram with Greek ───────────────────────────────────────────────────────

describe("isPangram (Greek)", () => {
  it("detects the Greek pangram correctly", () => {
    // "πολεμας" uses α+π+ο+λ+ε+μ+σ — all 7 letters
    expect(isPangram("πολεμας", puzzle)).toBe(true);
  });

  it("returns false for a non-pangram Greek word", () => {
    expect(isPangram("σαλα", puzzle)).toBe(false);
  });
});

// ── scoreWord with Greek ───────────────────────────────────────────────────────

describe("scoreWord (Greek)", () => {
  it("scores a 4-letter Greek word as 1 point", () => {
    expect(scoreWord("σαλα", puzzle)).toBe(1);
  });

  it("scores a 5-letter Greek word as 5 points", () => {
    expect(scoreWord("σαλος", puzzle)).toBe(5);
  });

  it("scores the Greek pangram with the 7-point bonus", () => {
    // "πολεμας" = 7 letters + 7 bonus = 14
    expect(scoreWord("πολεμας", puzzle)).toBe(14);
  });
});

// ── validateWord with Greek ────────────────────────────────────────────────────

describe("validateWord (Greek)", () => {
  it("accepts a valid Greek word", () => {
    const result = validateWord("σαλος", puzzle, []);
    expect(result.status).toBe("valid");
    expect(result.points).toBe(5);
  });

  it("accepts the Greek pangram and flags it", () => {
    const result = validateWord("πολεμας", puzzle, []);
    expect(result.status).toBe("valid");
    expect(result.isPangram).toBe(true);
  });

  it("rejects a Greek word missing the centre letter α", () => {
    // "πολεμος" (war) does not contain α
    const result = validateWord("πολεμος", puzzle, []);
    expect(result.status).toBe("missing_center");
  });

  it("rejects a Greek word with letters outside the puzzle set", () => {
    // "βαλε" contains β which is not in the puzzle
    const result = validateWord("βαλε", puzzle, []);
    expect(result.status).toBe("invalid_letter");
  });

  it("rejects a Greek word not in the valid list", () => {
    const result = validateWord("μελα", puzzle, []);
    expect(result.status).toBe("not_in_list");
  });
});

// ── Data loader with Greek ─────────────────────────────────────────────────────

describe("getPuzzleForDate (Greek)", () => {
  it("loads the Greek puzzle for the correct date", () => {
    const loaded = getPuzzleForDate("2026-03-25", "el");
    expect(loaded.language).toBe("el");
    expect(loaded.centerLetter).toBe("α");
  });

  it("falls back to the latest puzzle when date is not found", () => {
    const loaded = getPuzzleForDate("1900-01-01", "el");
    // Should return the last puzzle in the list (most recently added)
    expect(loaded.id).toBe("2026-04-01-el");
  });
});
