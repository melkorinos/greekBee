// puzzle.test.ts — unit tests for isDailyPuzzle() and isISODate().

import { describe, expect, it } from "vitest";

import { isDailyPuzzle, isISODate } from "@/games/leksokipos/lib/puzzle";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";

// Minimal puzzle stub — only `id` is needed by isDailyPuzzle
function puzzleWith(id: string): Pick<LeksokiposPuzzle, "id"> {
  return { id };
}

// ── isDailyPuzzle ─────────────────────────────────────────────────────────────

describe("isDailyPuzzle", () => {
  it("returns true for a standard daily ID (YYYY-MM-DD-el)", () => {
    expect(isDailyPuzzle(puzzleWith("2026-05-20-el"))).toBe(true);
  });

  it("returns true for a daily ID with no language suffix", () => {
    expect(isDailyPuzzle(puzzleWith("2026-05-20"))).toBe(true);
  });

  it("returns false for a custom puzzle ID", () => {
    expect(isDailyPuzzle(puzzleWith("custom-α-βγδεζη"))).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isDailyPuzzle(puzzleWith(""))).toBe(false);
  });

  it("returns false for a partial date", () => {
    expect(isDailyPuzzle(puzzleWith("2026-05"))).toBe(false);
  });
});

// ── isISODate ─────────────────────────────────────────────────────────────────

describe("isISODate", () => {
  it("returns true for a valid YYYY-MM-DD string", () => {
    expect(isISODate("2026-05-20")).toBe(true);
  });

  it("returns false when a suffix is appended", () => {
    expect(isISODate("2026-05-20-el")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isISODate("")).toBe(false);
  });

  it("returns false for a partial date", () => {
    expect(isISODate("2026-05")).toBe(false);
  });

  it("returns false for a non-date string", () => {
    expect(isISODate("custom-α-βγδεζη")).toBe(false);
  });
});
