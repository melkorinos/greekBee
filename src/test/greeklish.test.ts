// greeklish.test.ts — unit tests for the bijective Latin↔Greek transliteration utility.
//
// This module is the backbone of the greeklish URL scheme.  Bugs here break
// every custom puzzle URL, so coverage must be exhaustive.

import {
  GREEKLISH_TO_GREEK,
  GREEK_TO_GREEKLISH,
  greekToGreeklish,
  greeklishToGreek,
  isGreeklish,
} from "@/lib/greeklish";
import { describe, expect, it } from "vitest";

// ── Map integrity ─────────────────────────────────────────────────────────────

describe("GREEKLISH_TO_GREEK map", () => {
  it("has exactly 24 entries (one per Greek letter)", () => {
    expect(Object.keys(GREEKLISH_TO_GREEK)).toHaveLength(24);
  });

  it("every value is a single Greek lowercase letter", () => {
    for (const [, greek] of Object.entries(GREEKLISH_TO_GREEK)) {
      expect(greek).toHaveLength(1);
      expect(greek.codePointAt(0)).toBeGreaterThanOrEqual(0x03b1); // α
      expect(greek.codePointAt(0)).toBeLessThanOrEqual(0x03c9);    // ω
    }
  });

  it("every key is a single lowercase ASCII letter", () => {
    for (const latin of Object.keys(GREEKLISH_TO_GREEK)) {
      expect(latin).toHaveLength(1);
      expect(/^[a-z]$/.test(latin)).toBe(true);
    }
  });

  it("v and y are NOT in the map (no Greek equivalent)", () => {
    expect("v" in GREEKLISH_TO_GREEK).toBe(false);
    expect("y" in GREEKLISH_TO_GREEK).toBe(false);
  });
});

describe("GREEK_TO_GREEKLISH map", () => {
  it("has the same number of entries as GREEKLISH_TO_GREEK", () => {
    expect(Object.keys(GREEK_TO_GREEKLISH)).toHaveLength(
      Object.keys(GREEKLISH_TO_GREEK).length,
    );
  });

  it("is the exact inverse of GREEKLISH_TO_GREEK", () => {
    for (const [latin, greek] of Object.entries(GREEKLISH_TO_GREEK)) {
      expect(GREEK_TO_GREEKLISH[greek]).toBe(latin);
    }
  });
});

// ── Spot-check key mappings ───────────────────────────────────────────────────

describe("key mapping spot-checks", () => {
  const cases: [string, string][] = [
    ["a", "α"],
    ["b", "β"],
    ["g", "γ"],
    ["d", "δ"],
    ["e", "ε"],
    ["z", "ζ"],
    ["h", "η"],
    ["q", "θ"], // awkward: q → θ
    ["i", "ι"],
    ["k", "κ"],
    ["l", "λ"],
    ["m", "μ"],
    ["n", "ν"],
    ["j", "ξ"], // awkward: j → ξ
    ["o", "ο"],
    ["p", "π"],
    ["r", "ρ"],
    ["s", "σ"],
    ["t", "τ"],
    ["u", "υ"],
    ["f", "φ"],
    ["x", "χ"], // standard: x → χ
    ["c", "ψ"], // awkward: c → ψ
    ["w", "ω"],
  ];

  for (const [latin, greek] of cases) {
    it(`${latin} → ${greek}`, () => {
      expect(GREEKLISH_TO_GREEK[latin]).toBe(greek);
      expect(GREEK_TO_GREEKLISH[greek]).toBe(latin);
    });
  }
});

// ── greeklishToGreek ──────────────────────────────────────────────────────────

describe("greeklishToGreek", () => {
  it("converts a single letter", () => {
    expect(greeklishToGreek("k")).toBe("κ");
  });

  it("converts a 6-letter outer segment", () => {
    expect(greeklishToGreek("aeiost")).toBe("αειοστ");
  });

  it("converts the full 24-letter alphabet in one pass", () => {
    const allLatin = Object.keys(GREEKLISH_TO_GREEK).sort().join("");
    const allGreek = [...allLatin].map((ch) => GREEKLISH_TO_GREEK[ch]).join("");
    expect(greeklishToGreek(allLatin)).toBe(allGreek);
  });

  it("passes through characters not in the map unchanged", () => {
    // 'v' and 'y' are unmapped; should survive intact
    expect(greeklishToGreek("v")).toBe("v");
    expect(greeklishToGreek("y")).toBe("y");
  });

  it("handles an empty string", () => {
    expect(greeklishToGreek("")).toBe("");
  });
});

// ── greekToGreeklish ──────────────────────────────────────────────────────────

describe("greekToGreeklish", () => {
  it("converts a single letter", () => {
    expect(greekToGreeklish("κ")).toBe("k");
  });

  it("converts a 6-letter outer segment", () => {
    expect(greekToGreeklish("αειοστ")).toBe("aeiost");
  });

  it("passes through characters not in the map unchanged", () => {
    // accented Greek should not be in the map (map uses normalised forms only)
    expect(greekToGreeklish("ά")).toBe("ά");
  });

  it("handles an empty string", () => {
    expect(greekToGreeklish("")).toBe("");
  });
});

// ── Round-trips ───────────────────────────────────────────────────────────────

describe("round-trip invariants", () => {
  it("greeklishToGreek ∘ greekToGreeklish = identity for all 24 Greek letters", () => {
    const allGreek = Object.values(GREEKLISH_TO_GREEK).join("");
    expect(greeklishToGreek(greekToGreeklish(allGreek))).toBe(allGreek);
  });

  it("greekToGreeklish ∘ greeklishToGreek = identity for all 24 Latin letters", () => {
    const allLatin = Object.keys(GREEKLISH_TO_GREEK).sort().join("");
    expect(greekToGreeklish(greeklishToGreek(allLatin))).toBe(allLatin);
  });

  it("a realistic puzzle URL segment round-trips correctly", () => {
    // center=κ, outer=αειοστ
    const center = "κ";
    const outer = "αειοστ";
    expect(greeklishToGreek(greekToGreeklish(center))).toBe(center);
    expect(greeklishToGreek(greekToGreeklish(outer))).toBe(outer);
  });
});

// ── isGreeklish ───────────────────────────────────────────────────────────────

describe("isGreeklish", () => {
  it("returns true for a valid greeklish string", () => {
    expect(isGreeklish("aeiost")).toBe(true);
  });

  it("returns true for a single valid greeklish letter", () => {
    expect(isGreeklish("k")).toBe(true);
  });

  it("returns false for a string containing Greek letters", () => {
    expect(isGreeklish("αειοστ")).toBe(false);
  });

  it("returns false for a string containing unmapped ASCII letters (v, y)", () => {
    expect(isGreeklish("aeiovy")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isGreeklish("")).toBe(false);
  });

  it("returns false for a string with digits", () => {
    expect(isGreeklish("a1b")).toBe(false);
  });

  it("returns false for uppercase letters", () => {
    // map uses lowercase only; uppercase is not greeklish
    expect(isGreeklish("K")).toBe(false);
  });
});
