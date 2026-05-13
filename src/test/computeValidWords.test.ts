import { describe, expect, it } from "vitest";
import { computeValidWords } from "@/games/spelling-bee/lib/computeValidWords";

// Small synthetic word list for deterministic tests — no dependency on the
// full words-el.json so tests run fast and don't break if the word list changes.
const WORD_LIST = [
  // normalised (no accents) — mirrors what words-el.json contains
  "αλατι",    // 5 letters, contains α
  "αλασ",     // 4 letters, contains α (σ not σ — normalised form)
  "αλτ",      // 3 letters — too short, must be excluded
  "αλατα",    // 6 letters, contains α
  "βαλτοσ",   // 6 letters, contains α but also β which is NOT in set below
  "λαδι",     // 4 letters, contains no α if center is α — wait, α IS in λαδι? No. λ-α-δ-ι — yes it contains α
  "τελοσ",    // contains τ,ε,λ,ο,σ — none of center α
  "αλλα",     // 4 letters, all in {α,λ,τ,ι,δ,ε,σ}
  "αλλαγη",   // contains γ — NOT in allowed set
  "ααλλ",     // not a real word but structurally valid — 4 letters, only α,λ
];

const CENTER = "α";
const OUTER = ["λ", "τ", "ι", "δ", "ε", "σ"];
// Allowed set: α, λ, τ, ι, δ, ε, σ

describe("computeValidWords", () => {
  it("includes words that satisfy all rules", () => {
    const result = computeValidWords(CENTER, OUTER, WORD_LIST);
    expect(result).toContain("αλατι");
    expect(result).toContain("αλασ");
    expect(result).toContain("αλατα");
    expect(result).toContain("λαδι");
    expect(result).toContain("αλλα");
    expect(result).toContain("ααλλ");
  });

  it("excludes words shorter than 4 letters", () => {
    const result = computeValidWords(CENTER, OUTER, WORD_LIST);
    expect(result).not.toContain("αλτ");
  });

  it("excludes words that do not contain the center letter", () => {
    const result = computeValidWords(CENTER, OUTER, WORD_LIST);
    expect(result).not.toContain("τελοσ");
  });

  it("excludes words that contain letters outside the allowed set", () => {
    const result = computeValidWords(CENTER, OUTER, WORD_LIST);
    // βαλτοσ contains β which is not in the allowed set
    expect(result).not.toContain("βαλτοσ");
    // αλλαγη contains γ which is not in the allowed set
    expect(result).not.toContain("αλλαγη");
  });

  it("normalises accented input words before checking", () => {
    const accentedList = ["άλατι", "αλάσ"];
    const result = computeValidWords(CENTER, OUTER, accentedList);
    // After normalisation: άλατι → αλατι, αλάσ → αλασ — both valid
    expect(result).toContain("αλατι");
    expect(result).toContain("αλασ");
  });

  it("normalises the center letter input", () => {
    // Accented center — should still match words containing the unaccented form
    const result = computeValidWords("ά", OUTER, ["αλατι"]);
    expect(result).toContain("αλατι");
  });

  it("returns an empty array when no words match", () => {
    const result = computeValidWords("ω", ["β", "γ", "δ", "ζ", "η", "θ"], WORD_LIST);
    expect(result).toHaveLength(0);
  });

  it("returns an empty array for an empty word list", () => {
    const result = computeValidWords(CENTER, OUTER, []);
    expect(result).toHaveLength(0);
  });
});
