// Unit tests for pure game logic — no React, no DOM.
// These run fast and cover the core rules of the game.

import { describe, expect, it } from "vitest";
import { maxScore, scoreWord } from "@/lib/scoring";

import type { Puzzle } from "@/types";
import { calculateRank } from "@/lib/ranking";
import { isPangram } from "@/lib/pangram";
import { validateWord } from "@/lib/validation";

// ── Shared test fixture ────────────────────────────────────────────────────────

/** Minimal puzzle used across all logic tests */
const puzzle: Puzzle = {
  id: "test-puzzle",
  language: "el",
  date: "2026-01-01",
  centerLetter: "a",
  outerLetters: ["p", "i", "n", "t", "e", "d"],
  validWords: ["anti", "paid", "paint", "painted", "panted", "patina"],
};

// ── isPangram ──────────────────────────────────────────────────────────────────

describe("isPangram", () => {
  it("returns true when word uses all 7 puzzle letters", () => {
    expect(isPangram("painted", puzzle)).toBe(true);
  });

  it("returns false when word is missing one or more puzzle letters", () => {
    expect(isPangram("paint", puzzle)).toBe(false);
  });

  it("returns false for a 4-letter word", () => {
    expect(isPangram("anti", puzzle)).toBe(false);
  });
});

// ── scoreWord ──────────────────────────────────────────────────────────────────

describe("scoreWord", () => {
  it("scores a 4-letter word as 1 point (flat rate)", () => {
    expect(scoreWord("anti", puzzle)).toBe(1);
  });

  it("scores a 5-letter word as 5 points (1 per letter)", () => {
    expect(scoreWord("paint", puzzle)).toBe(5);
  });

  it("scores a pangram with the 7-point bonus on top of its length", () => {
    // "painted" = 7 letters + 7 bonus = 14
    expect(scoreWord("painted", puzzle)).toBe(14);
  });
});

describe("maxScore", () => {
  it("sums scores for all valid words in the puzzle", () => {
    // anti(1) + paid(1) + paint(5) + painted(14) + panted(6) + patina(6) = 33
    expect(maxScore(puzzle)).toBe(33);
  });
});

// ── calculateRank ──────────────────────────────────────────────────────────────

describe("calculateRank", () => {
  it("returns Beginner at 0 score", () => {
    expect(calculateRank(0, 100)).toBe("Beginner");
  });

  it("returns Genius at 70% of max score", () => {
    expect(calculateRank(70, 100)).toBe("Genius");
  });

  it("returns Queen Bee at 100% of max score", () => {
    expect(calculateRank(100, 100)).toBe("Queen Bee");
  });

  it("returns Beginner when maxScore is 0 (edge case)", () => {
    expect(calculateRank(0, 0)).toBe("Beginner");
  });
});

// ── validateWord ───────────────────────────────────────────────────────────────

describe("validateWord", () => {
  it("accepts a valid word and returns points", () => {
    const result = validateWord("paint", puzzle, []);
    expect(result.status).toBe("valid");
    expect(result.points).toBe(5);
    expect(result.isPangram).toBe(false);
  });

  it("accepts a pangram and flags it correctly", () => {
    const result = validateWord("painted", puzzle, []);
    expect(result.status).toBe("valid");
    expect(result.isPangram).toBe(true);
    expect(result.points).toBe(14);
  });

  it("rejects a word shorter than 4 letters", () => {
    const result = validateWord("ant", puzzle, []);
    expect(result.status).toBe("too_short");
    expect(result.points).toBe(0);
  });

  it("rejects a word missing the centre letter", () => {
    const result = validateWord("pint", puzzle, []);
    expect(result.status).toBe("missing_center");
  });

  it("rejects a word with letters not in the puzzle", () => {
    const result = validateWord("paint".replace("p", "z"), puzzle, []);
    expect(result.status).toBe("invalid_letter");
  });

  it("rejects a word not in the valid word list", () => {
    const result = validateWord("panda", puzzle, []);
    expect(result.status).toBe("not_in_list");
  });

  it("rejects a word the player has already found", () => {
    const result = validateWord("paint", puzzle, ["paint"]);
    expect(result.status).toBe("already_found");
  });

  it("validates case-insensitively (uppercased input accepted)", () => {
    const result = validateWord("PAINT", puzzle, []);
    expect(result.status).toBe("valid");
  });
});
