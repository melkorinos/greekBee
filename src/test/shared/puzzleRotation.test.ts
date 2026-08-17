// puzzleRotation.test.ts — the platform's two date→puzzle primitives.
// dateToIndex: epoch is 2025-01-01; the double-modulo must keep all results in
// [0, listLength). pickByDateOrRotate: the shared miss rule for a hand-authored
// daily calendar — the invariant is that a miss can never serve a future board
// and can never freeze on one board forever.

import { describe, expect, it } from "vitest";

import { dateToIndex, pickByDateOrRotate } from "@/lib/puzzleRotation";

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

// ── pickByDateOrRotate ────────────────────────────────────────────────────────

/** A three-day calendar, deliberately handed to the function out of order. */
const CALENDAR = [
  { date: "2026-01-03", id: "c" },
  { date: "2026-01-01", id: "a" },
  { date: "2026-01-02", id: "b" },
];

describe("pickByDateOrRotate", () => {
  it("serves the row pinned to the requested date", () => {
    expect(pickByDateOrRotate("2026-01-02", CALENDAR).id).toBe("b");
  });

  it("throws on an empty pool rather than returning undefined", () => {
    expect(() => pickByDateOrRotate("2026-01-02", [])).toThrow(/empty/);
  });

  it("never serves a future row on a gap day", () => {
    const gapped = [
      { date: "2026-01-01", id: "a" },
      { date: "2026-06-01", id: "future" },
    ];
    // 2026-01-15 is a gap: only "a" is due, so it is the only possible answer.
    expect(pickByDateOrRotate("2026-01-15", gapped).id).toBe("a");
  });

  it("never serves the last row once the calendar runs out", () => {
    // This is the defect the function exists to prevent: "fall back to the last
    // row" served the 2026-01-03 board on every day from 2026-01-04 forever.
    const after = ["2026-01-04", "2026-01-05", "2026-01-06", "2026-01-07"]
      .map((d) => pickByDateOrRotate(d, CALENDAR).id);

    expect(new Set(after).size).toBeGreaterThan(1);
  });

  it("replays only spent boards after the calendar runs out", () => {
    for (const date of ["2026-02-01", "2027-01-01", "2030-06-15"]) {
      expect(pickByDateOrRotate(date, CALENDAR).date <= date).toBe(true);
    }
  });

  it("is stable across repeat calls and independent of input order", () => {
    const shuffled = [...CALENDAR].reverse();
    for (const date of ["2026-01-02", "2026-05-05", "2031-12-31"]) {
      const a = pickByDateOrRotate(date, CALENDAR);
      const b = pickByDateOrRotate(date, shuffled);
      expect(a.id).toBe(b.id);
      expect(pickByDateOrRotate(date, CALENDAR).id).toBe(a.id);
    }
  });

  it("rotates the whole pool when nothing is due yet, rather than failing", () => {
    // An all-future calendar (or a one-row sample build): rendering beats hiding.
    const picked = pickByDateOrRotate("2025-06-01", CALENDAR);
    expect(CALENDAR).toContain(picked);
  });

  it("returns the only row of a single-row pool for every date", () => {
    const one = [{ date: "2026-01-01", id: "only" }];
    expect(pickByDateOrRotate("2020-01-01", one).id).toBe("only");
    expect(pickByDateOrRotate("2026-01-01", one).id).toBe("only");
    expect(pickByDateOrRotate("2099-01-01", one).id).toBe("only");
  });
});
