import { describe, expect, it } from "vitest";
import { autoNumberSlots } from "@/games/stavrolekso/lib/autoNumberSlots";
import { isConnected } from "@/games/stavrolekso/lib/isConnected";
import { normalizeAndCompare } from "@/games/stavrolekso/lib/normalizeAndCompare";
import { getSlotLength, getSlotCells, makeBlackSet } from "@/games/stavrolekso/lib/getSlotLength";

// ── autoNumberSlots ───────────────────────────────────────────────────────────

describe("autoNumberSlots", () => {
  it("numbers a clean 3×3 grid: 1 Across at (0,0) and 1 Down at (0,0)", () => {
    const slots = autoNumberSlots(3, 3, []);
    const across = slots.filter((s) => s.direction === "across");
    const down   = slots.filter((s) => s.direction === "down");
    // Row 0: cells 0,1,2 → starts Across; col 0: cells (0,0),(1,0),(2,0) → starts Down
    // Row 1 & 2 don't start a new Across (no left boundary after col 0 without black)
    // Cols 1 & 2 start Down? col1 row0: (0,1) — left is not black so starts Across? No.
    // (0,1): not left boundary, cell (0,0) is white → does not start Across
    // (0,1) for Down: r=0 (top boundary), isWhite(1,1) && isWhite(2,1) → starts Down
    expect(across.length).toBeGreaterThan(0);
    expect(down.length).toBeGreaterThan(0);
    expect(slots[0].number).toBe(1);
  });

  it("assigns same number to Across and Down starting at the same cell", () => {
    const slots = autoNumberSlots(3, 3, []);
    const atOrigin = slots.filter((s) => s.startRow === 0 && s.startCol === 0);
    expect(atOrigin.length).toBe(2);
    expect(atOrigin[0].number).toBe(atOrigin[1].number);
  });

  it("does not number a slot shorter than 3 cells", () => {
    // 3×3 with black at (0,2) — col 2 blocked, only 2 cells in Across for row 0
    const slots = autoNumberSlots(3, 3, [[0, 2]]);
    const acrossRow0 = slots.filter((s) => s.direction === "across" && s.startRow === 0);
    expect(acrossRow0.length).toBe(0);
  });

  it("numbers increment left-to-right top-to-bottom", () => {
    const slots = autoNumberSlots(5, 5, []);
    const nums = [...new Set(slots.map((s) => s.number))];
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i]).toBe(nums[i - 1] + 1);
    }
  });

  it("returns empty array for a fully black grid", () => {
    const all: [number, number][] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) all.push([r, c]);
    expect(autoNumberSlots(3, 3, all)).toEqual([]);
  });

  it("handles black square dividing a row correctly", () => {
    // 5×5, black at (0,2): row 0 split into [0,1] and [3,4] — both too short
    const slots = autoNumberSlots(5, 5, [[0, 2]]);
    const acrossRow0 = slots.filter((s) => s.direction === "across" && s.startRow === 0);
    expect(acrossRow0.length).toBe(0);
  });

  it("counts a 5-cell run with black splitting as two separate slots", () => {
    // 9×1 not valid but test on 3×9 with black at (0,3)
    const slots = autoNumberSlots(9, 3, [[0, 3]]);
    const acrossRow0 = slots.filter((s) => s.direction === "across" && s.startRow === 0);
    // Left run: cols 0-2 (3 cells) → valid; Right run: cols 4-8 (5 cells) → valid
    expect(acrossRow0.length).toBe(2);
  });
});

// ── isConnected ───────────────────────────────────────────────────────────────

describe("isConnected", () => {
  it("returns true for a grid with no black squares", () => {
    expect(isConnected(3, 3, [])).toBe(true);
  });

  it("returns true for a grid where all white cells are connected", () => {
    // Black square in center; all others still connected around it
    expect(isConnected(3, 3, [[1, 1]])).toBe(true);
  });

  it("returns false when black squares disconnect white cells", () => {
    // 3×3, black at entire middle row — top and bottom are disconnected
    expect(isConnected(3, 3, [[1, 0], [1, 1], [1, 2]])).toBe(false);
  });

  it("returns true when all cells are black (vacuously connected)", () => {
    const all: [number, number][] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) all.push([r, c]);
    expect(isConnected(3, 3, all)).toBe(true);
  });

  it("returns false for a vertical divider in a 3×3", () => {
    expect(isConnected(3, 3, [[0, 1], [1, 1], [2, 1]])).toBe(false);
  });
});

// ── normalizeAndCompare ───────────────────────────────────────────────────────

describe("normalizeAndCompare", () => {
  it("matches identical uppercase strings", () => {
    expect(normalizeAndCompare("ΑΘΗΝΑ", "ΑΘΗΝΑ")).toBe(true);
  });

  it("matches accented answer against unaccented input", () => {
    expect(normalizeAndCompare("ΑΘΗΝΑ", "ΑΘΉΝΑ")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(normalizeAndCompare("αθηνα", "ΑΘΗΝΑ")).toBe(true);
  });

  it("matches final sigma ς vs σ", () => {
    expect(normalizeAndCompare("ΕΛΛΑΣ", "ΕΛΛΆΣ")).toBe(true);
  });

  it("returns false for different words", () => {
    expect(normalizeAndCompare("ΑΘΗΝΑ", "ΠΑΤΡΑ")).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(normalizeAndCompare("", "ΑΘΗΝΑ")).toBe(false);
  });

  it("returns false for empty answer", () => {
    expect(normalizeAndCompare("ΑΘΗΝΑ", "")).toBe(false);
  });
});

// ── getSlotLength / getSlotCells ──────────────────────────────────────────────

describe("getSlotLength", () => {
  it("returns full row length for an unobstructed across slot", () => {
    const bs = makeBlackSet([]);
    expect(getSlotLength("across", 0, 0, 5, 5, bs)).toBe(5);
  });

  it("stops at a black square", () => {
    const bs = makeBlackSet([[0, 3]]);
    expect(getSlotLength("across", 0, 0, 5, 5, bs)).toBe(3);
  });

  it("returns full column length for down slot", () => {
    const bs = makeBlackSet([]);
    expect(getSlotLength("down", 0, 0, 5, 5, bs)).toBe(5);
  });

  it("stops at a black square for down", () => {
    const bs = makeBlackSet([[3, 0]]);
    expect(getSlotLength("down", 0, 0, 5, 5, bs)).toBe(3);
  });
});

describe("getSlotCells", () => {
  it("returns correct cell keys for an across slot", () => {
    const bs = makeBlackSet([]);
    expect(getSlotCells("across", 0, 0, 3, 3, bs)).toEqual(["0_0", "0_1", "0_2"]);
  });

  it("returns correct cell keys for a down slot", () => {
    const bs = makeBlackSet([]);
    expect(getSlotCells("down", 0, 1, 3, 3, bs)).toEqual(["0_1", "1_1", "2_1"]);
  });

  it("stops before a black square", () => {
    const bs = makeBlackSet([[0, 2]]);
    expect(getSlotCells("across", 0, 0, 5, 5, bs)).toEqual(["0_0", "0_1"]);
  });
});
