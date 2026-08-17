// computeCells.test.ts — the two cell-highlight projections shared by the
// Stavrolekso player and maker. Both map a slot selection onto the cell keys
// the grid should tint; neither knows anything about React.
//
// Fixtures use a clean 5×5, whose auto-numbering is worked out by hand:
//   across #1 @(0,0)  down #1 @(0,0)  down #2 @(0,1)  down #3 @(0,2)
//   down #4 @(0,3)    down #5 @(0,4)  across #6 @(1,0) … across #9 @(4,0)
// A slot number is therefore shared by an Across and a Down at the same cell,
// which is exactly what makes direction load-bearing below.

import { describe, expect, it } from "vitest";

import { computeHighlightedCells, computeSolvedCells } from "@/games/stavrolekso/lib/computeCells";
import { autoNumberSlots } from "@/games/stavrolekso/lib/autoNumberSlots";
import { makeBlackSet } from "@/games/stavrolekso/lib/getSlotLength";

const CLEAN_5 = autoNumberSlots(5, 5, []);
const NO_BLACK = makeBlackSet([]);

describe("computeHighlightedCells", () => {
  it("returns the cells of the selected slot", () => {
    const cells = computeHighlightedCells({ number: 1, direction: "down" }, CLEAN_5, 5, 5, NO_BLACK);
    expect([...cells]).toEqual(["0_0", "1_0", "2_0", "3_0", "4_0"]);
  });

  it("highlights nothing when no slot is selected", () => {
    expect(computeHighlightedCells(null, CLEAN_5, 5, 5, NO_BLACK).size).toBe(0);
  });

  it("matches on direction as well as number — #2 exists only as a Down", () => {
    const across = computeHighlightedCells({ number: 2, direction: "across" }, CLEAN_5, 5, 5, NO_BLACK);
    const down   = computeHighlightedCells({ number: 2, direction: "down" }, CLEAN_5, 5, 5, NO_BLACK);
    expect(across.size).toBe(0);
    expect([...down]).toEqual(["0_1", "1_1", "2_1", "3_1", "4_1"]);
  });

  it("stops the run at a black square", () => {
    const black = [[0, 3]] as [number, number][];
    const slots = autoNumberSlots(5, 5, black);
    const cells = computeHighlightedCells({ number: 1, direction: "across" }, slots, 5, 5, makeBlackSet(black));
    expect([...cells]).toEqual(["0_0", "0_1", "0_2"]);
  });
});

describe("computeSolvedCells", () => {
  it("lights both directions of a solved number — the player solves a number, not a run", () => {
    const cells = computeSolvedCells([1], CLEAN_5, 5, 5, NO_BLACK);
    expect([...cells].sort()).toEqual(
      ["0_0", "0_1", "0_2", "0_3", "0_4", "1_0", "2_0", "3_0", "4_0"],
    );
  });

  it("lights nothing when nothing is solved", () => {
    expect(computeSolvedCells([], CLEAN_5, 5, 5, NO_BLACK).size).toBe(0);
  });

  it("ignores a number with no slot", () => {
    expect(computeSolvedCells([99], CLEAN_5, 5, 5, NO_BLACK).size).toBe(0);
  });
});
