// puzzleDate.test.ts — normalizePuzzleDate: strips trailing locale suffix.

import { describe, expect, it } from "vitest";

import { normalizePuzzleDate } from "@/lib/puzzleDate";

describe("normalizePuzzleDate", () => {
  it("passes through a plain date unchanged", () => {
    expect(normalizePuzzleDate("2026-05-22")).toBe("2026-05-22");
  });

  it("strips a lowercase two-letter locale suffix", () => {
    expect(normalizePuzzleDate("2026-05-22-el")).toBe("2026-05-22");
  });

  it("strips an uppercase locale suffix (case-insensitive regex)", () => {
    expect(normalizePuzzleDate("2026-05-22-EL")).toBe("2026-05-22");
  });

  it("strips a mixed-case locale suffix", () => {
    expect(normalizePuzzleDate("2026-05-22-El")).toBe("2026-05-22");
  });

  it("returns empty string for null", () => {
    expect(normalizePuzzleDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(normalizePuzzleDate(undefined)).toBe("");
  });

  it("returns empty string for an empty string", () => {
    expect(normalizePuzzleDate("")).toBe("");
  });
});
