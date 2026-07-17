// endgame.test.ts — the remaining-words fold behind the endgame panel.
//
// These ran only through GameBoard before (rendering a board, driving it to the
// top rank, reading the panel); the fold is pure, so it is unit-tested here and
// the component tests are left to cover the wiring.

import { describe, expect, it } from "vitest";

import { computeEndgameInfo, getRemainingWords } from "@/games/leksokipos/lib/endgame";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";

// centerLetter α + outer βγδεζη. "αβγδεζη" uses all 7 → pangram.
const puzzle: LeksokiposPuzzle = {
  id:           "test",
  language:     "el",
  date:         "2026-01-01",
  centerLetter: "α",
  outerLetters: ["β", "γ", "δ", "ε", "ζ", "η"],
  validWords:   ["αβγδ", "αβγδε", "αβγδεζ", "αβγδεζη", "ηζεδγβα"],
};

describe("getRemainingWords", () => {
  it("returns every valid word when nothing has been found", () => {
    expect(getRemainingWords(puzzle, [])).toEqual(puzzle.validWords);
  });

  it("returns nothing when every word has been found", () => {
    expect(getRemainingWords(puzzle, [...puzzle.validWords])).toEqual([]);
  });

  it("excludes found words regardless of the casing the player typed", () => {
    expect(getRemainingWords(puzzle, ["ΑΒΓΔ", "Αβγδε"])).toEqual([
      "αβγδεζ",
      "αβγδεζη",
      "ηζεδγβα",
    ]);
  });

  it("ignores found words that are not in the puzzle", () => {
    expect(getRemainingWords(puzzle, ["λαλαλα"])).toEqual(puzzle.validWords);
  });
});

describe("computeEndgameInfo", () => {
  it("counts the remaining total", () => {
    const info = computeEndgameInfo(puzzle, getRemainingWords(puzzle, []));
    expect(info.remainingTotal).toBe(5);
  });

  it("counts remaining pangrams, not all remaining words", () => {
    const info = computeEndgameInfo(puzzle, getRemainingWords(puzzle, []));
    expect(info.remainingPangrams).toBe(2); // αβγδεζη + its anagram ηζεδγβα
  });

  it("drops a pangram from the count once it is found", () => {
    const info = computeEndgameInfo(puzzle, getRemainingWords(puzzle, ["αβγδεζη"]));
    expect(info.remainingPangrams).toBe(1);
  });

  it("groups remaining words by length, longest first", () => {
    const info = computeEndgameInfo(puzzle, getRemainingWords(puzzle, []));
    expect(info.byLength).toEqual([
      { length: 7, count: 2 },
      { length: 6, count: 1 },
      { length: 5, count: 1 },
      { length: 4, count: 1 },
    ]);
  });

  it("reports an empty breakdown at a perfect score", () => {
    const info = computeEndgameInfo(puzzle, getRemainingWords(puzzle, [...puzzle.validWords]));
    expect(info).toEqual({ remainingTotal: 0, remainingPangrams: 0, byLength: [] });
  });
});
