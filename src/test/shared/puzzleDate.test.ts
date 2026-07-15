// puzzleDate.test.ts — normalizePuzzleDate: strips trailing locale suffix.

import { describe, expect, it } from "vitest";

import { normalizePuzzleDate, resolvePuzzleDateParam } from "@/lib/puzzleDate";

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

describe("resolvePuzzleDateParam", () => {
  const today = "2026-07-15";

  it("passes through a valid YYYY-MM-DD param", () => {
    expect(resolvePuzzleDateParam("2026-07-10", today)).toBe("2026-07-10");
  });

  it("falls back to today when the param is undefined", () => {
    expect(resolvePuzzleDateParam(undefined, today)).toBe(today);
  });

  it("falls back to today for a malformed date", () => {
    expect(resolvePuzzleDateParam("not-a-date", today)).toBe(today);
  });

  it("falls back to today for an empty string", () => {
    expect(resolvePuzzleDateParam("", today)).toBe(today);
  });

  it("falls back to today for a date-like string with extra characters", () => {
    expect(resolvePuzzleDateParam("2026-07-10T00:00:00", today)).toBe(today);
  });
});
