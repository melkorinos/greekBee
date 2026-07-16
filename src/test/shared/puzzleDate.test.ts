// puzzleDate.test.ts — the platform's puzzle-date helpers.

import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizePuzzleDate, resolvePuzzleDateParam, todayISO } from "@/lib/puzzleDate";

describe("todayISO", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a YYYY-MM-DD date string", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("reads the UTC date, not the local one", () => {
    // 00:30 UTC on the 15th. Any local-time reading east of UTC still says the
    // 15th, so the discriminating case is a *westward* offset, where local time
    // is still the 14th.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T00:30:00Z"));
    expect(todayISO()).toBe("2026-07-15");
  });

  it("rolls over at UTC midnight — 23:59 UTC is still the same day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T23:59:59Z"));
    expect(todayISO()).toBe("2026-07-15");
  });

  it("does not roll over at Athens midnight (UTC+3 in July)", () => {
    // 00:30 Athens on the 16th = 21:30 UTC on the 15th. The daily puzzle
    // deliberately still serves the 15th until 03:00 Athens time.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T21:30:00Z"));
    expect(todayISO()).toBe("2026-07-15");
  });
});

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
