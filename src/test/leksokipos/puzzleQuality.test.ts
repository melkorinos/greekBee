// Puzzle-quality gates — the generation-time filters that decide which letter
// sets are allowed to become daily puzzles at all (they never affect how an
// already-shipped puzzle scores).
//
// Seam under test: scripts/lib/leksokipos/puzzleQuality.ts public functions.
// These run in the generators (batch-generate, generate-puzzle) and in the
// one-off prune script, and are pinned on the committed corpus by
// puzzleCorpusQuality.test.ts.
//
// Expected values here come from hand-worked examples, never from re-running the
// implementation's own formula — a tautological test could not catch a drift
// between this module and the real scoring in games/leksokipos/lib/scoring.ts,
// which is precisely the bug this module is most likely to grow.

import { describe, expect, it } from "vitest";

import { LEKSOKIPOS } from "@/config/gameRules";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import {
  countPangrams,
  meetsDifficultyRules,
  realisticWordsToGenius,
  totalPointsAvailable,
} from "../../../scripts/lib/leksokipos/puzzleQuality";

/** Builds a puzzle whose letters are α (centre) + βγδεζη. */
function puzzleWith(validWords: string[]): LeksokiposPuzzle {
  return {
    id: "test-puzzle",
    language: "el",
    date: "2026-03-25",
    centerLetter: "α",
    outerLetters: ["β", "γ", "δ", "ε", "ζ", "η"],
    validWords,
  };
}

/** A word using all 7 letters — worth its length + PANGRAM_BONUS. */
const PANGRAM = "αβγδεζη"; // 7 letters

describe("countPangrams", () => {
  it("counts only the words that use all seven letters", () => {
    const puzzle = puzzleWith(["αβγδ", PANGRAM, "αβγδε", `${PANGRAM}β`]);

    // PANGRAM and PANGRAM+β cover all 7; the other two do not.
    expect(countPangrams(puzzle)).toBe(2);
  });

  it("is zero when no word covers the full letter set", () => {
    expect(countPangrams(puzzleWith(["αβγδ", "αβγδε"]))).toBe(0);
  });
});

describe("totalPointsAvailable", () => {
  it("sums every valid word using the real scoring rules", () => {
    // Worked by hand against the documented rules:
    //   "αβγδ"  → 4 letters      → 1 point (flat)
    //   "αβγδε" → 5 letters      → 5 points
    //   PANGRAM → 7 letters + 7  → 14 points
    //   total                    → 20 points
    const puzzle = puzzleWith(["αβγδ", "αβγδε", PANGRAM]);

    expect(totalPointsAvailable(puzzle)).toBe(20);
    // Guard the hand-computed pangram bonus against a config change.
    expect(LEKSOKIPOS.PANGRAM_BONUS).toBe(7);
  });

  it("is zero for a puzzle with no valid words", () => {
    expect(totalPointsAvailable(puzzleWith([]))).toBe(0);
  });
});

describe("realisticWordsToGenius", () => {
  it("returns the genius bar divided by the puzzle's mean word score", () => {
    // 10 identical 5-letter words → 5 points each → total 50, mean 5.
    // Scaled: ceil(50 × 0.75) = 38 → below the soft-cap knee, passes through.
    // Genius bar at the 80% top rank: ceil(38 × 0.8) = 31.
    // Realistic words: ceil(31 / 5) = 7.
    const puzzle = puzzleWith(Array.from({ length: 10 }, () => "αβγδε"));

    expect(realisticWordsToGenius(puzzle)).toBe(7);
  });

  it("never exceeds the number of words actually in the puzzle", () => {
    // The index is a ratio of two derived numbers, so a pathological puzzle must
    // not claim a player needs more words than exist.
    const puzzle = puzzleWith(["αβγδ", "αβγδε", PANGRAM]);

    expect(realisticWordsToGenius(puzzle)).toBeLessThanOrEqual(puzzle.validWords.length);
  });

  it("is zero for a puzzle with no valid words rather than NaN", () => {
    // mean word score would divide by zero — the guard matters because the
    // generators call this on candidate letter sets before any filtering.
    expect(realisticWordsToGenius(puzzleWith([]))).toBe(0);
  });
});

describe("meetsDifficultyRules", () => {
  it("rejects a puzzle at or above the pangram ceiling", () => {
    const tooManyPangrams = puzzleWith(
      Array.from({ length: LEKSOKIPOS.MAX_PANGRAMS }, (_, i) => PANGRAM + "β".repeat(i)),
    );

    expect(countPangrams(tooManyPangrams)).toBe(LEKSOKIPOS.MAX_PANGRAMS);
    expect(meetsDifficultyRules(tooManyPangrams)).toBe(false);
  });

  it("accepts a modest puzzle that clears both gates", () => {
    const fine = puzzleWith(["αβγδ", "αβγδε", PANGRAM]);

    expect(countPangrams(fine)).toBeLessThan(LEKSOKIPOS.MAX_PANGRAMS);
    expect(realisticWordsToGenius(fine)).toBeLessThan(LEKSOKIPOS.MAX_WORDS_TO_GENIUS);
    expect(meetsDifficultyRules(fine)).toBe(true);
  });

  it("rejects a puzzle at or above the tedium ceiling", () => {
    // A large garden of cheap 4-pointers: every word scores 1, so the mean is 1
    // and the realistic index equals the genius bar in points — far past the gate.
    const tedious = puzzleWith([
      PANGRAM,
      ...Array.from({ length: 900 }, (_, i) => `αβγδ${i}`),
    ]);

    expect(realisticWordsToGenius(tedious)).toBeGreaterThanOrEqual(
      LEKSOKIPOS.MAX_WORDS_TO_GENIUS,
    );
    expect(meetsDifficultyRules(tedious)).toBe(false);
  });
});

describe("parity with the shipped scoring module", () => {
  it("totalPointsAvailable agrees with maxScore's own raw sum", async () => {
    // The single most likely bug in this module is a reimplemented scoring rule
    // that silently drifts from the game. Pin them together: maxScore applies
    // SCORE_SCALE + softCap on top of exactly the sum this function returns.
    const { maxScore, softCap } = await import("@/games/leksokipos/lib/scoring");
    const puzzle = puzzleWith(["αβγδ", "αβγδε", PANGRAM, "αβγδεζ"]);

    const expected = softCap(Math.ceil(totalPointsAvailable(puzzle) * LEKSOKIPOS.SCORE_SCALE));

    expect(maxScore(puzzle)).toBe(expected);
  });
});
