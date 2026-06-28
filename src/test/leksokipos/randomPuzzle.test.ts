// randomPuzzle.test.ts — pickRandom7(): quality rules for random Leksokipos puzzles.
// Runs 200 iterations to gain statistical confidence on stochastic constraints.

import { describe, expect, it } from "vitest";

import { pickRandom7, GREEK_VOWELS } from "@/games/leksokipos/lib/randomPuzzle";

const ITERATIONS = 200;

function runAll() {
  return Array.from({ length: ITERATIONS }, () => pickRandom7());
}

const VALID_LETTERS = new Set([
  "α", "β", "γ", "δ", "ε", "ζ", "η", "θ",
  "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π",
  "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω",
]);

describe("pickRandom7", () => {
  it("always returns exactly 6 outer letters", () => {
    for (const { outer } of runAll()) {
      expect(outer).toHaveLength(6);
    }
  });

  it("center letter is always a vowel", () => {
    for (const { center } of runAll()) {
      expect(GREEK_VOWELS.has(center)).toBe(true);
    }
  });

  it("outer ring always contains at least 1 vowel (≥2 vowels total)", () => {
    for (const { outer } of runAll()) {
      const outerVowels = outer.filter((l) => GREEK_VOWELS.has(l));
      expect(outerVowels.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("outer ring always contains at least 2 consonants", () => {
    for (const { outer } of runAll()) {
      const consonants = outer.filter((l) => !GREEK_VOWELS.has(l));
      expect(consonants.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("all 7 letters are unique (no duplicates)", () => {
    for (const { center, outer } of runAll()) {
      const all = [center, ...outer];
      expect(new Set(all).size).toBe(7);
    }
  });

  it("all letters are from the known 24-letter Greek pool", () => {
    for (const { center, outer } of runAll()) {
      expect(VALID_LETTERS.has(center)).toBe(true);
      for (const l of outer) expect(VALID_LETTERS.has(l)).toBe(true);
    }
  });

  it("center never appears in the outer ring", () => {
    for (const { center, outer } of runAll()) {
      expect(outer).not.toContain(center);
    }
  });
});
