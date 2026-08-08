// puzzle.test.ts — unit tests for isDailyPuzzle().
// isISODate lives in @/lib/puzzleDate and is covered by shared/puzzleDate.test.ts.

import { describe, expect, it } from "vitest";

import { isDailyPuzzle } from "@/games/leksokipos/lib/puzzle";
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
