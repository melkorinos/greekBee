// Unit tests for pure game logic — no React, no DOM.
// These run fast and cover the core rules of the game.
//
// The fixture uses Greek letters — the production alphabet — so every rule is
// proven against real input (lowercase, final-sigma ς→σ, no ASCII assumptions).
// This file absorbed the former greekLogic.test.ts (2026-07-02); its
// getPuzzleForDate cases already live in leksokiposDataLoader.test.ts.

import { maxScore, scoreWord, softCap } from "@/games/leksokipos/lib/scoring";
import { describe, expect, it } from "vitest";

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { LEKSOKIPOS } from "@/config/gameRules";
import { RANKS, calculateRank } from "@/games/leksokipos/lib/ranking";
import { isPangram } from "@/games/leksokipos/lib/pangram";
import { validateWord } from "@/games/leksokipos/lib/validation";

// ── Shared test fixture ────────────────────────────────────────────────────────

/** Minimal Greek puzzle used across all logic tests. "πολεμας" is the pangram. */
const puzzle: LeksokiposPuzzle = {
  id: "test-puzzle-el",
  language: "el",
  date: "2026-01-01",
  centerLetter: "α",
  outerLetters: ["π", "ο", "λ", "ε", "μ", "σ"],
  validWords: ["σαλα", "μαλα", "σαλος", "παλμος", "σαλεμα", "πολεμα", "πολεμας"],
};

// ── isPangram ──────────────────────────────────────────────────────────────────

describe("isPangram", () => {
  it("returns true when word uses all 7 puzzle letters", () => {
    // "πολεμας" uses α+π+ο+λ+ε+μ+σ — all 7 letters
    expect(isPangram("πολεμας", puzzle)).toBe(true);
  });

  it("returns false when word is missing one or more puzzle letters", () => {
    // "πολεμα" is missing σ
    expect(isPangram("πολεμα", puzzle)).toBe(false);
  });

  it("returns false for a 4-letter word", () => {
    expect(isPangram("σαλα", puzzle)).toBe(false);
  });
});

// ── scoreWord ──────────────────────────────────────────────────────────────────

describe("scoreWord", () => {
  it("scores a 4-letter word as 1 point (flat rate)", () => {
    expect(scoreWord("σαλα", puzzle)).toBe(1);
  });

  it("scores a 5-letter word as 5 points (1 per letter)", () => {
    expect(scoreWord("σαλος", puzzle)).toBe(5);
  });

  it("scores a pangram with the 7-point bonus on top of its length", () => {
    // "πολεμας" = 7 letters + 7 bonus = 14
    expect(scoreWord("πολεμας", puzzle)).toBe(14);
  });
});

describe("maxScore", () => {
  it("returns SCORE_SCALE of the raw word-score total for small puzzles", () => {
    // raw: σαλα(1) + μαλα(1) + σαλος(5) + παλμος(6) + σαλεμα(6) + πολεμα(6) + πολεμας(14) = 39
    // scaled: ceil(39 * 0.75) = 30 — below SOFT_CAP_KNEE, so it passes through uncapped
    expect(maxScore(puzzle)).toBe(30);
  });

  it("compresses large puzzles above the knee without a hard ceiling", () => {
    // Build a puzzle whose scaled raw lands well above the soft-cap knee.
    // 100 × 10-letter words each score 10 pts → raw = 1000, scaled = 750 > knee (400).
    const bigWords = Array.from({ length: 100 }, (_, i) =>
      "αβγδεζηθι" + String.fromCharCode(945 + (i % 24))
    );
    const bigPuzzle: LeksokiposPuzzle = { ...puzzle, validWords: bigWords };
    const scaled = Math.ceil(1000 * LEKSOKIPOS.SCORE_SCALE); // 850
    const m = maxScore(bigPuzzle);
    // Rose above the knee (no flat pin) but was compressed below the raw scaled total.
    expect(m).toBeGreaterThan(LEKSOKIPOS.SOFT_CAP_KNEE);
    expect(m).toBeLessThan(scaled);
  });
});

// ── softCap ────────────────────────────────────────────────────────────────────

describe("softCap", () => {
  it("passes scores at or below the knee through unchanged", () => {
    expect(softCap(0)).toBe(0);
    expect(softCap(200)).toBe(200);
    expect(softCap(LEKSOKIPOS.SOFT_CAP_KNEE)).toBe(LEKSOKIPOS.SOFT_CAP_KNEE);
  });

  it("compresses above the knee while staying strictly increasing (no ceiling)", () => {
    const knee = LEKSOKIPOS.SOFT_CAP_KNEE;
    const a = softCap(knee + 200);
    const b = softCap(knee + 800);
    const c = softCap(knee + 3200);
    // Each richer puzzle yields a distinct, higher max — so the genius bar varies.
    expect(a).toBeGreaterThan(knee);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    // …but always below the uncompressed input (the cap is doing its job).
    expect(a).toBeLessThan(knee + 200);
    expect(c).toBeLessThan(knee + 3200);
  });
});

// ── calculateRank ──────────────────────────────────────────────────────────────

describe("calculateRank", () => {
  it("returns the lowest rank at 0 score", () => {
    expect(calculateRank(0, 100)).toBe(RANKS[0].name);
  });

  it("returns the 60%-tier rank at 70% of max score", () => {
    expect(calculateRank(70, 100)).toBe(RANKS[6].name);
  });

  it("returns the top rank at 100% of max score", () => {
    expect(calculateRank(100, 100)).toBe(RANKS[RANKS.length - 1].name);
  });

  it("returns the lowest rank when maxScore is 0 (edge case)", () => {
    expect(calculateRank(0, 0)).toBe(RANKS[0].name);
  });
});

// ── validateWord ───────────────────────────────────────────────────────────────

describe("validateWord", () => {
  it("accepts a valid word and returns points", () => {
    const result = validateWord("σαλος", puzzle, []);
    expect(result.status).toBe("valid");
    expect(result.points).toBe(5);
    expect(result.isPangram).toBe(false);
  });

  it("accepts a pangram and flags it correctly", () => {
    const result = validateWord("πολεμας", puzzle, []);
    expect(result.status).toBe("valid");
    expect(result.isPangram).toBe(true);
    expect(result.points).toBe(14);
  });

  it("rejects a word shorter than 4 letters", () => {
    const result = validateWord("σαλ", puzzle, []);
    expect(result.status).toBe("too_short");
    expect(result.points).toBe(0);
  });

  it("rejects a word missing the centre letter", () => {
    // "πολεμος" (war) does not contain α
    const result = validateWord("πολεμος", puzzle, []);
    expect(result.status).toBe("missing_center");
  });

  it("rejects a word with letters not in the puzzle", () => {
    // "βαλε" contains β which is not in the puzzle
    const result = validateWord("βαλε", puzzle, []);
    expect(result.status).toBe("invalid_letter");
  });

  it("rejects a word not in the valid word list", () => {
    // "μελα" uses only puzzle letters incl. α, but is not in validWords
    const result = validateWord("μελα", puzzle, []);
    expect(result.status).toBe("not_in_list");
  });

  it("rejects a word the player has already found", () => {
    const result = validateWord("σαλα", puzzle, ["σαλα"]);
    expect(result.status).toBe("already_found");
  });

  it("validates case-insensitively (uppercased input accepted)", () => {
    // Uppercase Greek — normalizeLetters lowercases and folds final sigma ς→σ
    const result = validateWord("ΣΑΛΟΣ", puzzle, []);
    expect(result.status).toBe("valid");
  });
});
