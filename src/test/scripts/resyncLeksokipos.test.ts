// Unit tests for the Leksokipos re-sync adapter used by apply-nominations.ts.
// Guards the contract: removed words leave every puzzle that listed them; added
// words join only puzzles whose letter set accepts them; untouched puzzles keep
// referential identity so the writer can skip them.
//
// Drives the adapter through its ResyncAdapter interface (resync is pure —
// content in, content out), so load/write I/O is never exercised here.

import { describe, it, expect } from "vitest";

import { leksokiposAdapter } from "../../../scripts/lib/resync/leksokipos";
import type { LeksokiposResyncContent } from "../../../scripts/lib/resync/leksokipos";

// Puzzle: centre α, outer π ο λ ε μ σ → allowed letters {α,π,ο,λ,ε,μ,σ}.
// validWords are all genuinely valid for this set.
const puzzles = (): LeksokiposResyncContent => [
  {
    id: "2026-01-01-el",
    centerLetter: "α",
    outerLetters: ["π", "ο", "λ", "ε", "μ", "σ"],
    validWords: ["αλμα", "λαμπα", "σαλεπα"],
  },
];

const resync = (content: LeksokiposResyncContent, added: string[] = [], removed: string[] = []) =>
  leksokiposAdapter.resync(content, { added, removed });

describe("leksokiposAdapter.resync", () => {
  it("removes a deleted word from every puzzle that listed it", () => {
    const before = puzzles();
    const { content, report } = resync(before, [], ["αλμα"]);
    expect(content[0].validWords).not.toContain("αλμα");
    expect(report.changed).toHaveLength(1);
    expect(report.changed[0].removed).toEqual(["αλμα"]);
  });

  it("adds a newly-valid word only to puzzles whose letters accept it", () => {
    const before = puzzles();
    const { content, report } = resync(before, ["αμπελοσ"]); // pangram — uses all 7
    expect(content[0].validWords).toContain("αμπελοσ");
    expect(report.changed[0].added).toEqual(["αμπελοσ"]);
  });

  it("does not add a word the puzzle's letters reject", () => {
    const before = puzzles();
    const { content, report } = resync(before, ["αβγα"]); // β, γ not in the set
    expect(content[0]).toBe(before[0]); // untouched — identity preserved
    expect(report.changed).toHaveLength(0);
  });

  it("does not add a word missing the centre letter", () => {
    const before = puzzles();
    const { content, report } = resync(before, ["πολε"]); // no α
    expect(content[0]).toBe(before[0]);
    expect(report.changed).toHaveLength(0);
  });

  it("does not add a word under the minimum length", () => {
    const before = puzzles();
    const { content, report } = resync(before, ["αλ"]);
    expect(content[0]).toBe(before[0]);
    expect(report.changed).toHaveLength(0);
  });

  it("does not duplicate a word already present", () => {
    const before = puzzles();
    const { content, report } = resync(before, ["λαμπα"]);
    expect(content[0]).toBe(before[0]);
    expect(report.changed).toHaveLength(0);
  });

  it("lets removal win when the same word is both added and removed", () => {
    const before = puzzles();
    const { content } = resync(before, ["αλμα"], ["αλμα"]);
    expect(content[0].validWords).not.toContain("αλμα");
  });

  it("normalises edits before matching (accents / final sigma)", () => {
    const before = puzzles();
    // "ΛΆΜΠΑ" normalises to "λαμπα", already present → no change
    const { report } = resync(before, ["ΛΆΜΠΑ"]);
    expect(report.changed).toHaveLength(0);
  });

  it("preserves original word order on removal (minimal diff)", () => {
    const before = puzzles();
    const { content } = resync(before, [], ["λαμπα"]);
    expect(content[0].validWords).toEqual(["αλμα", "σαλεπα"]);
  });

  it("returns the same puzzle objects when nothing changes", () => {
    const before = puzzles();
    const { content, report } = resync(before);
    expect(content[0]).toBe(before[0]);
    expect(report.changed).toHaveLength(0);
  });

  it("reports no warnings for ordinary word-level edits", () => {
    const before = puzzles();
    const { report } = resync(before, ["αμπελοσ"], ["αλμα"]);
    expect(report.warnings).toEqual([]);
  });

  it("warns when a removal strips a board's last pangram (issue 09)", () => {
    // αμπελοσ is the only pangram (uses all 7 of {α,π,ο,λ,ε,μ,σ}); removing it
    // leaves the board with no pangram and no other listed word can cover.
    const before: LeksokiposResyncContent = [
      {
        id: "2027-01-01-el",
        centerLetter: "α",
        outerLetters: ["π", "ο", "λ", "ε", "μ", "σ"],
        validWords: ["αμπελοσ", "αλμα", "λαμπα"],
      },
    ];
    const { report } = resync(before, [], ["αμπελοσ"]);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toContain("2027-01-01-el");
    expect(report.warnings[0]).toContain("no pangram");
  });

  it("does not warn when a removed word was not the last pangram", () => {
    // Two pangrams present; removing one leaves the other.
    const before: LeksokiposResyncContent = [
      {
        id: "2027-01-02-el",
        centerLetter: "α",
        outerLetters: ["π", "ο", "λ", "ε", "μ", "σ"],
        validWords: ["αμπελοσ", "σαμπλεο"],
      },
    ];
    const { report } = resync(before, [], ["αμπελοσ"]);
    expect(report.warnings).toEqual([]);
  });
});
