// puzzleRotation.test.ts — dateToIndex: deterministic puzzle selection by date.
// Epoch is 2025-01-01; the double-modulo must keep all results in [0, listLength).

import { describe, expect, it } from "vitest";

import { dateToIndex } from "@/lib/puzzleRotation";

describe("dateToIndex", () => {
  it("returns 0 on the epoch day itself (2025-01-01)", () => {
    expect(dateToIndex("2025-01-01", 10)).toBe(0);
  });

  it("returns 1 the day after the epoch", () => {
    expect(dateToIndex("2025-01-02", 10)).toBe(1);
  });

  it("wraps around correctly at list boundary", () => {
    // Day 10 from epoch should wrap back to index 0
    expect(dateToIndex("2025-01-11", 10)).toBe(0);
    // Day 11 wraps to index 1
    expect(dateToIndex("2025-01-12", 10)).toBe(1);
  });

  it("returns a non-negative index for pre-epoch dates", () => {
    // 2024-12-31 is day -1 relative to epoch; double-modulo must yield listLength-1
    const idx = dateToIndex("2024-12-31", 10);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(10);
    expect(idx).toBe(9);
  });

  it("returns 0 for any date when listLength is 1", () => {
    expect(dateToIndex("2025-01-01", 1)).toBe(0);
    expect(dateToIndex("2026-06-28", 1)).toBe(0);
    expect(dateToIndex("2024-01-01", 1)).toBe(0);
  });

  it("stays within bounds for a far-future date", () => {
    const listLength = 7;
    const idx = dateToIndex("2030-12-31", listLength);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(listLength);
  });

  it("is deterministic — same date always gives same result", () => {
    const a = dateToIndex("2026-03-15", 30);
    const b = dateToIndex("2026-03-15", 30);
    expect(a).toBe(b);
  });
});
