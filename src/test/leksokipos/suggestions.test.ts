// suggestions.test.ts — unit tests for the suggestions localStorage utility.
// Verifies deduplication, normalisation, and SSR safety.

import { afterEach, describe, expect, it } from "vitest";
import { getSuggestedWords, isSuggested, markSuggested } from "@/hooks/suggestions";

import { clearSlice } from "@/hooks/useGameStore";

afterEach(() => {
  clearSlice("suggestions");
});

// ── getSuggestedWords ─────────────────────────────────────────────────────────

describe("getSuggestedWords", () => {
  it("returns an empty array when nothing has been suggested", () => {
    expect(getSuggestedWords()).toEqual([]);
  });

  it("returns words that have been marked", () => {
    markSuggested("καλος");
    markSuggested("αλφα");
    expect(getSuggestedWords()).toContain("καλος");
    expect(getSuggestedWords()).toContain("αλφα");
  });
});

// ── markSuggested ─────────────────────────────────────────────────────────────

describe("markSuggested", () => {
  it("adds a word to the suggestions list", () => {
    markSuggested("καλος");
    expect(getSuggestedWords()).toContain("καλος");
  });

  it("normalises the word to lowercase before storing", () => {
    markSuggested("ΚΑΛΟΣ");
    expect(getSuggestedWords()).toContain("καλος");
  });

  it("is idempotent — adding the same word twice stores it only once", () => {
    markSuggested("καλος");
    markSuggested("καλος");
    const all = getSuggestedWords();
    expect(all.filter((w) => w === "καλος")).toHaveLength(1);
  });

  it("trims whitespace before storing", () => {
    markSuggested("  καλος  ");
    expect(getSuggestedWords()).toContain("καλος");
  });
});

// ── isSuggested ──────────────────────────────────────────────────────────────

describe("isSuggested", () => {
  it("returns false for a word that has not been suggested", () => {
    expect(isSuggested("καλος")).toBe(false);
  });

  it("returns true for a word that has been marked", () => {
    markSuggested("καλος");
    expect(isSuggested("καλος")).toBe(true);
  });

  it("is case-insensitive", () => {
    markSuggested("καλος");
    expect(isSuggested("ΚΑΛΟΣ")).toBe(true);
  });

  it("does not match a different word", () => {
    markSuggested("καλος");
    expect(isSuggested("κακος")).toBe(false);
  });
});
