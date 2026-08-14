// makerSlots.test.ts — the maker's save/resume round-trip.
//
// The maker edits a flat cell map (`"row_col" → letter`); the wire format is a
// list of slots each carrying a whole answer string. `assembleSlots` goes one
// way, `restoreCellsFromSlots` the other, and a puzzle resumed by ID travels
// through both. A drift between them corrupts a resumed puzzle silently — the
// author sees letters land in the wrong squares and has no way to tell why —
// so the round-trip is pinned as its own test below.
//
// Fixture is a clean 5×5, whose auto-numbering is worked out by hand:
//   across #1 @(0,0)  down #1 @(0,0)  down #2 @(0,1)  down #3 @(0,2)
//   down #4 @(0,3)    down #5 @(0,4)  across #6 @(1,0) … across #9 @(4,0)

import { describe, expect, it } from "vitest";

import { assembleSlots, clueKey, restoreCellsFromSlots } from "@/games/stavrolekso/lib/makerSlots";
import type { SlotDef } from "@/games/stavrolekso/types";

/** A fully-filled 5×5 board, written out so the expected answers are readable. */
const ROWS = ["ΑΒΓΔΕ", "ΖΗΘΙΚ", "ΛΜΝΞΟ", "ΠΡΣΤΥ", "ΦΧΨΩΑ"];

function filledCells(): Record<string, string> {
  const cells: Record<string, string> = {};
  ROWS.forEach((row, r) => [...row].forEach((letter, c) => { cells[`${r}_${c}`] = letter; }));
  return cells;
}

function find(slots: SlotDef[], number: number, direction: "across" | "down"): SlotDef {
  const slot = slots.find((s) => s.number === number && s.direction === direction);
  if (!slot) throw new Error(`no slot ${number} ${direction}`);
  return slot;
}

describe("assembleSlots", () => {
  it("reads each slot's answer off the cell map", () => {
    const slots = assembleSlots(5, [], filledCells(), {});
    expect(find(slots, 1, "across").answer).toBe("ΑΒΓΔΕ");
    expect(find(slots, 1, "down").answer).toBe("ΑΖΛΠΦ");
    expect(find(slots, 6, "across").answer).toBe("ΖΗΘΙΚ");
    expect(find(slots, 5, "down").answer).toBe("ΕΚΟΥΑ");
  });

  it("attaches the clue written against that number and direction", () => {
    const clues = { [clueKey(1, "across")]: "Πρώτη οριζόντια", [clueKey(1, "down")]: "Πρώτη κάθετη" };
    const slots = assembleSlots(5, [], filledCells(), clues);
    expect(find(slots, 1, "across").clue).toBe("Πρώτη οριζόντια");
    expect(find(slots, 1, "down").clue).toBe("Πρώτη κάθετη");
    expect(find(slots, 6, "across").clue).toBe("");
  });

  it("collapses a hole rather than padding it, so a gappy slot reads as too short", () => {
    // Only the ends of row 0 are typed. The middle is empty, not blank-filled:
    // the answer comes back length 2 against a run of 5, which is what the
    // submit gate keys on to say "δεν έχει συμπληρωθεί".
    const slots = assembleSlots(5, [], { "0_0": "Α", "0_4": "Ε" }, {});
    expect(find(slots, 1, "across").answer).toBe("ΑΕ");
  });
});

describe("restoreCellsFromSlots", () => {
  it("spreads each stored answer back across its own run", () => {
    const stored: SlotDef[] = [
      { number: 1, direction: "across", startRow: 0, startCol: 0, answer: "ΑΒΓΔΕ", clue: "" },
      { number: 1, direction: "down",   startRow: 0, startCol: 0, answer: "ΑΖΛΠΦ", clue: "" },
    ];
    const { cells } = restoreCellsFromSlots(5, [], stored);
    expect(cells["0_0"]).toBe("Α");
    expect(cells["0_4"]).toBe("Ε");
    expect(cells["4_0"]).toBe("Φ");
  });

  it("keys restored clues by number and direction", () => {
    const stored: SlotDef[] = [
      { number: 1, direction: "across", startRow: 0, startCol: 0, answer: "ΑΒΓΔΕ", clue: "Οριζόντια" },
      { number: 1, direction: "down",   startRow: 0, startCol: 0, answer: "ΑΖΛΠΦ", clue: "" },
    ];
    const { clues } = restoreCellsFromSlots(5, [], stored);
    expect(clues[clueKey(1, "across")]).toBe("Οριζόντια");
    expect(clues[clueKey(1, "down")]).toBeUndefined();
  });

  it("ignores an answer that overruns its run rather than writing past the black square", () => {
    const black = [[0, 3]] as [number, number][];
    const stored: SlotDef[] = [
      { number: 1, direction: "across", startRow: 0, startCol: 0, answer: "ΑΒΓΔΕ", clue: "" },
    ];
    const { cells } = restoreCellsFromSlots(5, black, stored);
    expect(cells["0_3"]).toBeUndefined();
    expect(cells["0_4"]).toBeUndefined();
    expect(cells["0_2"]).toBe("Γ");
  });
});

describe("the round trip", () => {
  it("returns a completed grid unchanged through save and resume", () => {
    const cells = filledCells();
    const clues = { [clueKey(1, "across")]: "Πρώτη", [clueKey(9, "across")]: "Τελευταία" };
    const restored = restoreCellsFromSlots(5, [], assembleSlots(5, [], cells, clues));
    expect(restored.cells).toEqual(cells);
    expect(restored.clues).toEqual(clues);
  });

  it("is NOT identity for a grid with holes — letters left-pack on the way back", () => {
    // Assemble collapses the hole (across #1 becomes "ΑΕ"), so restore has no
    // way to know where it was and lays both letters down from the start of the
    // run — inventing an "Ε" at 0_1 that the author never typed. 0_4 keeps its
    // own copy only because down #5 carries it independently.
    // Unreachable in practice: the submit gate refuses a slot shorter than its
    // run, so nothing gappy is ever stored — but it is why that gate must stay.
    const gappy = { "0_0": "Α", "0_4": "Ε" };
    const restored = restoreCellsFromSlots(5, [], assembleSlots(5, [], gappy, {}));
    expect(restored.cells).not.toEqual(gappy);
    expect(restored.cells["0_1"]).toBe("Ε");
  });
});
