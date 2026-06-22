// Unit tests for the pure puzzle re-sync helpers used by apply-nominations.mjs.
// Guards the contract: removed words leave every puzzle that listed them; added
// words join only puzzles whose letter set accepts them; untouched puzzles keep
// referential identity so the writer can skip them.

import { describe, it, expect } from "vitest";

import {
  normalise,
  puzzleAcceptsWord,
  resyncPuzzles,
} from "../../../scripts/lib/resync-puzzles.mjs";

// Puzzle: centre α, outer π ο λ ε μ σ → allowed letters {α,π,ο,λ,ε,μ,σ}.
// validWords are all genuinely valid for this set.
const puzzle = () => ({
  id: "2026-01-01-el",
  centerLetter: "α",
  outerLetters: ["π", "ο", "λ", "ε", "μ", "σ"],
  validWords: ["αλμα", "λαμπα", "σαλεπα"],
});

describe("normalise", () => {
  it("lowercases, strips accents, and maps final sigma", () => {
    expect(normalise("ΑΓΆΠΗ")).toBe("αγαπη");
    expect(normalise("λόγος")).toBe("λογοσ");
  });
});

describe("puzzleAcceptsWord", () => {
  const p = puzzle();

  it("accepts a ≥4-letter word with the centre and only puzzle letters", () => {
    expect(puzzleAcceptsWord(p, "λαμπα")).toBe(true);
    expect(puzzleAcceptsWord(p, "αμπελοσ")).toBe(true); // uses all 7 (pangram)
  });

  it("rejects words under 4 letters", () => {
    expect(puzzleAcceptsWord(p, "αλ")).toBe(false);
  });

  it("rejects a word with a letter outside the puzzle set", () => {
    expect(puzzleAcceptsWord(p, "αβγα")).toBe(false); // β, γ not allowed
  });

  it("rejects a word that does not contain the centre letter", () => {
    expect(puzzleAcceptsWord(p, "πολε")).toBe(false); // no α
  });
});

describe("resyncPuzzles", () => {
  it("removes a deleted word from every puzzle that listed it", () => {
    const puzzles = [puzzle()];
    const { puzzles: next, changed } = resyncPuzzles(puzzles, { removed: ["αλμα"] });
    expect(next[0].validWords).not.toContain("αλμα");
    expect(changed).toHaveLength(1);
    expect(changed[0].removed).toEqual(["αλμα"]);
  });

  it("adds a newly-valid word only to puzzles whose letters accept it", () => {
    const puzzles = [puzzle()];
    const { puzzles: next, changed } = resyncPuzzles(puzzles, { added: ["αμπελοσ"] });
    expect(next[0].validWords).toContain("αμπελοσ");
    expect(changed[0].added).toEqual(["αμπελοσ"]);
  });

  it("does not add a word the puzzle's letters reject", () => {
    const puzzles = [puzzle()];
    const { puzzles: next, changed } = resyncPuzzles(puzzles, { added: ["αβγα"] });
    expect(next[0]).toBe(puzzles[0]); // untouched — identity preserved
    expect(changed).toHaveLength(0);
  });

  it("does not duplicate a word already present", () => {
    const puzzles = [puzzle()];
    const { puzzles: next, changed } = resyncPuzzles(puzzles, { added: ["λαμπα"] });
    expect(next[0]).toBe(puzzles[0]);
    expect(changed).toHaveLength(0);
  });

  it("lets removal win when the same word is both added and removed", () => {
    const puzzles = [puzzle()];
    const { puzzles: next } = resyncPuzzles(puzzles, {
      added: ["αλμα"],
      removed: ["αλμα"],
    });
    expect(next[0].validWords).not.toContain("αλμα");
  });

  it("normalises edits before matching (accents / final sigma)", () => {
    const puzzles = [puzzle()];
    // "ΛΆΜΠΑ" normalises to "λαμπα", already present → no change
    const { changed } = resyncPuzzles(puzzles, { added: ["ΛΆΜΠΑ"] });
    expect(changed).toHaveLength(0);
  });

  it("preserves original word order on removal (minimal diff)", () => {
    const puzzles = [puzzle()];
    const { puzzles: next } = resyncPuzzles(puzzles, { removed: ["λαμπα"] });
    expect(next[0].validWords).toEqual(["αλμα", "σαλεπα"]);
  });

  it("returns the same puzzle objects when nothing changes", () => {
    const puzzles = [puzzle()];
    const { puzzles: next, changed } = resyncPuzzles(puzzles, {});
    expect(next[0]).toBe(puzzles[0]);
    expect(changed).toHaveLength(0);
  });
});
