// normalize.test.ts — dedicated unit tests for the normalizeLetters utility.
// normalizeLetters is the foundation of all Greek letter comparison in this
// project: it strips accents and normalises final sigma. Every game that
// handles Greek text depends on it being correct.

import { describe, expect, it } from "vitest";
import { normalizeLetters } from "@/lib/normalize";

describe("normalizeLetters", () => {
  // ── Case folding ────────────────────────────────────────────────────────────

  it("lowercases Latin letters", () => {
    expect(normalizeLetters("ABC")).toBe("abc");
  });

  it("lowercases Greek capital letters", () => {
    expect(normalizeLetters("ΑΒΓΔ")).toBe("αβγδ");
  });

  // ── Accent stripping ────────────────────────────────────────────────────────

  it("strips the acute accent from a single Greek letter", () => {
    expect(normalizeLetters("ά")).toBe("α");
  });

  it("strips accents from a full Greek word", () => {
    expect(normalizeLetters("άλφα")).toBe("αλφα");
  });

  it("strips accents from all accented Greek vowels", () => {
    expect(normalizeLetters("άέήίόύώ")).toBe("αεηιουω");
  });

  it("leaves letters that have no accent unchanged", () => {
    expect(normalizeLetters("αβγδεζηθ")).toBe("αβγδεζηθ");
  });

  // ── Final sigma normalisation ────────────────────────────────────────────────

  it("converts Greek final sigma ς to regular sigma σ", () => {
    expect(normalizeLetters("ς")).toBe("σ");
  });

  it("converts final sigma inside a real Greek word", () => {
    // "παλμος" with final sigma at end
    expect(normalizeLetters("παλμος")).toBe("παλμοσ");
  });

  it("handles a word with both an accent and final sigma", () => {
    // "τέλος" → τελοσ
    expect(normalizeLetters("τέλος")).toBe("τελοσ");
  });

  // ── Combined inputs ─────────────────────────────────────────────────────────

  it("handles a mixed upper+accented Greek word", () => {
    expect(normalizeLetters("ΆΛΦΑ")).toBe("αλφα");
  });

  it("is idempotent — already normalised input is unchanged", () => {
    const s = "αλφα";
    expect(normalizeLetters(normalizeLetters(s))).toBe(normalizeLetters(s));
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it("handles an empty string without throwing", () => {
    expect(normalizeLetters("")).toBe("");
  });

  it("handles a string with only spaces without throwing", () => {
    expect(normalizeLetters("   ")).toBe("   ");
  });

  it("leaves non-Greek Latin letters unaffected (other than lowercasing)", () => {
    expect(normalizeLetters("Hello")).toBe("hello");
  });
});
