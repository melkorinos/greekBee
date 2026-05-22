// noAccents.test.ts — enforces the "zero Greek accents anywhere" contract.
//
// Greek accents must never appear in:
//   • Puzzle letter fields (centerLetter, outerLetters) — in both pre-built and custom puzzles
//   • Words stored in game state (foundWords, lastSubmission.word)
//   • Valid words returned by computeValidWords / buildCustomPuzzle
//   • The canonical share URL path
//   • Puzzle IDs
//
// This file is the single source of truth for the no-accent invariant.
// If any of these tests fail, it means an accent slipped through somewhere
// and will be visible to players.

import { describe, expect, it } from "vitest";
import { buildCustomPuzzle } from "@/data/spelling-bee";
import { computeValidWords } from "@/games/spelling-bee/lib/computeValidWords";
import { parseCustomUrl } from "@/games/spelling-bee/lib/parseCustomUrl";
import { buildInitialState, gameReducer } from "@/games/spelling-bee/hooks/gameReducer";
import type { SpellingBeePuzzle } from "@/games/spelling-bee/types";
import { getPuzzleForDate, getRandomPuzzle } from "@/data/spelling-bee";
import puzzlesEl from "@/data/spelling-bee/puzzles-el.json";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if the string contains any Unicode combining diacritical mark. */
function hasAccent(s: string): boolean {
  return s.normalize("NFD").split("").some((ch) => {
    const cp = ch.codePointAt(0)!;
    // Combining Diacritical Marks: U+0300–U+036F
    return cp >= 0x0300 && cp <= 0x036f;
  });
}

/** Assert that every character in every word is accent-free. */
function expectNoAccents(words: string[], label: string) {
  for (const word of words) {
    expect(hasAccent(word), `"${word}" in ${label} contains an accent`).toBe(false);
  }
}

// ── hasAccent helper self-check ───────────────────────────────────────────────

describe("hasAccent helper", () => {
  it("detects an accented Greek vowel", () => {
    expect(hasAccent("ά")).toBe(true);
    expect(hasAccent("έ")).toBe(true);
    expect(hasAccent("ή")).toBe(true);
    expect(hasAccent("ί")).toBe(true);
    expect(hasAccent("ό")).toBe(true);
    expect(hasAccent("ύ")).toBe(true);
    expect(hasAccent("ώ")).toBe(true);
  });

  it("returns false for unaccented Greek letters", () => {
    expect(hasAccent("αβγδεζηθ")).toBe(false);
  });

  it("returns false for ASCII and unaccented Latin", () => {
    expect(hasAccent("hello")).toBe(false);
    expect(hasAccent("abc123")).toBe(false);
  });
});

// ── puzzles-el.json puzzle letters ────────────────────────────────────────────

describe("puzzles-el.json — no accents in puzzle letter fields", () => {
  const puzzles = puzzlesEl as SpellingBeePuzzle[];

  it("centerLetter is accent-free in every puzzle", () => {
    for (const p of puzzles) {
      expect(
        hasAccent(p.centerLetter),
        `Puzzle ${p.id}: centerLetter "${p.centerLetter}" has an accent`
      ).toBe(false);
    }
  });

  it("every outerLetter is accent-free in every puzzle", () => {
    for (const p of puzzles) {
      for (const letter of p.outerLetters) {
        expect(
          hasAccent(letter),
          `Puzzle ${p.id}: outerLetter "${letter}" has an accent`
        ).toBe(false);
      }
    }
  });
});

// ── buildCustomPuzzle output ──────────────────────────────────────────────────

describe("buildCustomPuzzle — no accents in output", () => {
  const puzzle = buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);

  it("centerLetter is accent-free", () => {
    expect(hasAccent(puzzle.centerLetter)).toBe(false);
  });

  it("all outerLetters are accent-free", () => {
    for (const l of puzzle.outerLetters) {
      expect(hasAccent(l)).toBe(false);
    }
  });

  it("all validWords are accent-free", () => {
    expectNoAccents(puzzle.validWords, "buildCustomPuzzle.validWords");
  });

  it("puzzle id is accent-free", () => {
    expect(hasAccent(puzzle.id)).toBe(false);
  });

  it("normalises accented input — resulting fields are still accent-free", () => {
    const p2 = buildCustomPuzzle("ά", ["λ", "τ", "ί", "δ", "έ", "σ"]);
    expect(hasAccent(p2.centerLetter)).toBe(false);
    for (const l of p2.outerLetters) expect(hasAccent(l)).toBe(false);
    expectNoAccents(p2.validWords, "buildCustomPuzzle (accented input).validWords");
  });
});

// ── computeValidWords output ──────────────────────────────────────────────────

describe("computeValidWords — returned words are always accent-free", () => {
  it("accent-free input produces accent-free words", () => {
    const words = computeValidWords("α", ["λ", "τ", "ι", "δ", "ε", "σ"], ["αλατι", "αλασ", "αλλα"]);
    expectNoAccents(words, "computeValidWords (clean input)");
  });

  it("accented input words are normalised before being returned", () => {
    // Source words have accents; output must not
    const words = computeValidWords("α", ["λ", "τ", "ι", "δ", "ε", "σ"], ["άλατι", "αλάσ", "άλλα"]);
    expectNoAccents(words, "computeValidWords (accented input)");
  });
});

// ── parseCustomUrl output ─────────────────────────────────────────────────────

describe("parseCustomUrl — normalised output is accent-free", () => {
  it("accent-free input produces accent-free output", () => {
    const result = parseCustomUrl("α", "βγδεζη");
    expect(hasAccent(result!.center)).toBe(false);
    for (const l of result!.outer) expect(hasAccent(l)).toBe(false);
  });

  it("accented input is normalised to accent-free output", () => {
    const result = parseCustomUrl("ά", "βγδέζη");
    expect(hasAccent(result!.center)).toBe(false);
    for (const l of result!.outer) expect(hasAccent(l)).toBe(false);
  });

  it("canonical URL path built from output contains no accents", () => {
    const result = parseCustomUrl("α", "βγδεζη");
    const path = `/spelling-bee/${result!.center}/${result!.outer.join("")}`;
    expect(hasAccent(path)).toBe(false);
  });
});

// ── Game reducer — stored words are accent-free ───────────────────────────────

describe("gameReducer SUBMIT_WORD — stored words are accent-free", () => {
  const puzzle: SpellingBeePuzzle = {
    id: "test-noaccents",
    language: "el",
    date: "2026-01-01",
    centerLetter: "α",
    outerLetters: ["λ", "τ", "ι", "δ", "ε", "σ"],
    validWords: ["αλατι", "αλασ", "αλλα"],
  };

  function typeAndSubmit(letters: string[]): ReturnType<typeof buildInitialState> {
    let state = buildInitialState(puzzle);
    for (const l of letters) {
      state = gameReducer(state, { type: "ADD_LETTER", letter: l });
    }
    return gameReducer(state, { type: "SUBMIT_WORD" });
  }

  it("found word is stored without accents when input letters are accent-free", () => {
    const state = typeAndSubmit(["α", "λ", "α", "τ", "ι"]);
    expect(state.foundWords).toContain("αλατι");
    expectNoAccents(state.foundWords, "foundWords (clean input)");
  });

  it("found word is stored without accents even if ADD_LETTER received an accented letter", () => {
    // Simulate a rare path where an accented letter somehow reaches ADD_LETTER
    let state = buildInitialState(puzzle);
    // Type άλατι with an accented α — the reducer must strip it on submit
    for (const l of ["ά", "λ", "α", "τ", "ι"]) {
      state = gameReducer(state, { type: "ADD_LETTER", letter: l });
    }
    state = gameReducer(state, { type: "SUBMIT_WORD" });
    expectNoAccents(state.foundWords, "foundWords (accented ADD_LETTER)");
  });

  it("lastSubmission.word is stored without accents", () => {
    const state = typeAndSubmit(["α", "λ", "α", "τ", "ι"]);
    if (state.lastSubmission) {
      expect(hasAccent(state.lastSubmission.word)).toBe(false);
    }
  });
});

// ── Data loader spot-checks ────────────────────────────────────────────────────

describe("Data loader spot-checks — puzzle letter fields are accent-free", () => {
  it("getPuzzleForDate returns a puzzle with accent-free letter fields", () => {
    const p = getPuzzleForDate("2026-03-25");
    expect(hasAccent(p.centerLetter)).toBe(false);
    for (const l of p.outerLetters) expect(hasAccent(l)).toBe(false);
  });

  it("getRandomPuzzle returns a puzzle with accent-free letter fields", () => {
    const p = getRandomPuzzle("el");
    expect(hasAccent(p.centerLetter)).toBe(false);
    for (const l of p.outerLetters) expect(hasAccent(l)).toBe(false);
  });
});
