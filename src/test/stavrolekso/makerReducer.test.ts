// makerReducer.test.ts — every editing rule of the Stavrolekso maker.
//
// The reducer is pure and derives its own slot numbering: `slots` and the black
// set are recomputed from `size` + `blackSquares` on each action rather than
// passed in, so the signature stays (state, action) and no caller can hand it a
// numbering that disagrees with the grid.
//
// Phase 2 shapes the grid (black squares), phase 3 fills it (letters + clues).
// A clean 5×5 is not a legal player size but is a legal reducer state, and its
// numbering is small enough to work out by hand:
//   across #1 @(0,0)  down #1 @(0,0)  down #2 @(0,1)  down #3 @(0,2)
//   down #4 @(0,3)    down #5 @(0,4)  across #6 @(1,0) … across #9 @(4,0)

import { describe, expect, it } from "vitest";

import { makerReducer, makeInitialMakerState, isLetterKey } from "@/games/stavrolekso/lib/makerReducer";
import type { MakerState } from "@/games/stavrolekso/types";

/** A 5×5 phase-3 state with a cursor parked at the start of 1 Across. */
function editing(overrides: Partial<MakerState> = {}): MakerState {
  return {
    ...makeInitialMakerState(),
    phase: 3,
    size: 5,
    selectedSlot: { number: 1, direction: "across" },
    activeCellKey: "0_0",
    ...overrides,
  };
}

describe("isLetterKey", () => {
  // Exported so the page can decide whether to swallow the keystroke without
  // re-deriving the rule — a second copy of the regex is how the two drift.
  it("accepts what TYPE_LETTER accepts and nothing else", () => {
    expect(["Α", "α", "ω", "A", "z"].every(isLetterKey)).toBe(true);
    expect(["1", "-", " ", "Enter", "ArrowLeft", "ά", "Backspace"].some(isLetterKey)).toBe(false);
  });
});

describe("TOGGLE_BLACK", () => {
  it("adds a square that was white", () => {
    const next = makerReducer(makeInitialMakerState(), { type: "TOGGLE_BLACK", row: 2, col: 3 });
    expect(next.blackSquares).toEqual([[2, 3]]);
  });

  it("removes a square that was already black", () => {
    const start = { ...makeInitialMakerState(), blackSquares: [[2, 3], [4, 4]] as [number, number][] };
    const next = makerReducer(start, { type: "TOGGLE_BLACK", row: 2, col: 3 });
    expect(next.blackSquares).toEqual([[4, 4]]);
  });

  it("wipes every letter, clue and cursor — reshaping the grid renumbers it", () => {
    // Deliberate, not incidental: slot numbers are derived from the black
    // squares, so a toggle can renumber or delete the slot a clue was written
    // against. Keeping the maps would silently re-point them at other slots.
    const start = editing({
      cells: { "0_0": "Α", "0_1": "Β" },
      clues: { "1-across": "Μια ερώτηση" },
    });
    const next = makerReducer(start, { type: "TOGGLE_BLACK", row: 4, col: 4 });
    expect(next.cells).toEqual({});
    expect(next.clues).toEqual({});
    expect(next.selectedSlot).toBeNull();
    expect(next.activeCellKey).toBeNull();
  });

  it("does not mutate the state it was given", () => {
    const start = makeInitialMakerState();
    makerReducer(start, { type: "TOGGLE_BLACK", row: 2, col: 3 });
    expect(start.blackSquares).toEqual([]);
  });
});

describe("SELECT_CELL", () => {
  it("prefers the Across slot through a freshly clicked cell", () => {
    const start = editing({ selectedSlot: null, activeCellKey: null });
    const next = makerReducer(start, { type: "SELECT_CELL", row: 2, col: 3 });
    expect(next.selectedSlot).toEqual({ number: 7, direction: "across" });
    expect(next.activeCellKey).toBe("2_3");
  });

  it("cycles to the other direction when the same cell is clicked again", () => {
    const first  = makerReducer(editing({ selectedSlot: null }), { type: "SELECT_CELL", row: 2, col: 3 });
    const second = makerReducer(first, { type: "SELECT_CELL", row: 2, col: 3 });
    expect(second.selectedSlot).toEqual({ number: 4, direction: "down" });
    expect(second.activeCellKey).toBe("2_3");
  });

  it("wraps back to the first slot on the third click", () => {
    let s = makerReducer(editing({ selectedSlot: null }), { type: "SELECT_CELL", row: 2, col: 3 });
    s = makerReducer(s, { type: "SELECT_CELL", row: 2, col: 3 });
    s = makerReducer(s, { type: "SELECT_CELL", row: 2, col: 3 });
    expect(s.selectedSlot).toEqual({ number: 7, direction: "across" });
  });

  it("jumps to the new cell's own slot rather than cycling, when a different cell is clicked", () => {
    const onRow2 = makerReducer(editing({ selectedSlot: null }), { type: "SELECT_CELL", row: 2, col: 3 });
    const onRow3 = makerReducer(onRow2, { type: "SELECT_CELL", row: 3, col: 1 });
    expect(onRow3.selectedSlot).toEqual({ number: 8, direction: "across" });
    expect(onRow3.activeCellKey).toBe("3_1");
  });

  it("stays put when the cell belongs to only one slot", () => {
    // Row 0 is broken into runs of 1 and 2 by the two black squares, so no
    // Across is numbered there and (0,0) is reachable only as 1 Down.
    const start = editing({ size: 5, blackSquares: [[0, 1], [0, 2]], selectedSlot: null });
    const first  = makerReducer(start, { type: "SELECT_CELL", row: 0, col: 0 });
    const second = makerReducer(first, { type: "SELECT_CELL", row: 0, col: 0 });
    expect(first.selectedSlot).toEqual({ number: 1, direction: "down" });
    expect(second.selectedSlot).toEqual({ number: 1, direction: "down" });
  });

  it("ignores a click on a black square", () => {
    const start = editing({ blackSquares: [[2, 3]] });
    expect(makerReducer(start, { type: "SELECT_CELL", row: 2, col: 3 })).toBe(start);
  });

  it("ignores a click on a white cell that no slot runs through", () => {
    // (2,2) is white but boxed in: its Across and Down runs are one cell long,
    // and a slot needs three.
    const start = editing({ blackSquares: [[2, 1], [2, 3], [1, 2], [3, 2]], selectedSlot: null });
    expect(makerReducer(start, { type: "SELECT_CELL", row: 2, col: 2 })).toBe(start);
  });
});

describe("TYPE_LETTER", () => {
  it("writes the letter and steps one cell along the slot", () => {
    const next = makerReducer(editing(), { type: "TYPE_LETTER", key: "Α" });
    expect(next.cells).toEqual({ "0_0": "Α" });
    expect(next.activeCellKey).toBe("0_1");
    expect(next.selectedSlot).toEqual({ number: 1, direction: "across" });
  });

  it("upper-cases what the keyboard sent", () => {
    const next = makerReducer(editing(), { type: "TYPE_LETTER", key: "α" });
    expect(next.cells["0_0"]).toBe("Α");
  });

  it("overwrites the letter already in the cell", () => {
    const next = makerReducer(editing({ cells: { "0_0": "Β" } }), { type: "TYPE_LETTER", key: "Α" });
    expect(next.cells["0_0"]).toBe("Α");
  });

  it("jumps to the next numbered slot at the end of a run", () => {
    // 1 Across ends at (0,4); the next number is 2, which exists only as a Down
    // starting at (0,1).
    const next = makerReducer(editing({ activeCellKey: "0_4" }), { type: "TYPE_LETTER", key: "Ε" });
    expect(next.cells["0_4"]).toBe("Ε");
    expect(next.selectedSlot).toEqual({ number: 2, direction: "down" });
    expect(next.activeCellKey).toBe("0_1");
  });

  it("parks the cursor at the end of the last slot rather than wrapping", () => {
    const start = editing({ selectedSlot: { number: 9, direction: "across" }, activeCellKey: "4_4" });
    const next = makerReducer(start, { type: "TYPE_LETTER", key: "Ω" });
    expect(next.cells["4_4"]).toBe("Ω");
    expect(next.selectedSlot).toEqual({ number: 9, direction: "across" });
    expect(next.activeCellKey).toBe("4_4");
  });

  it("accepts Latin letters — the maker types on whatever layout is loaded", () => {
    expect(makerReducer(editing(), { type: "TYPE_LETTER", key: "a" }).cells["0_0"]).toBe("A");
  });

  it.each(["1", "-", "Enter", "ArrowLeft", " ", "ά"])("ignores %o", (key) => {
    const start = editing();
    expect(makerReducer(start, { type: "TYPE_LETTER", key })).toBe(start);
  });

  it("ignores a keystroke with no cursor", () => {
    const start = editing({ selectedSlot: null, activeCellKey: null });
    expect(makerReducer(start, { type: "TYPE_LETTER", key: "Α" })).toBe(start);
  });

  it("ignores a keystroke aimed at a slot the grid no longer has", () => {
    const start = editing({ selectedSlot: { number: 99, direction: "across" } });
    expect(makerReducer(start, { type: "TYPE_LETTER", key: "Α" })).toBe(start);
  });
});

describe("BACKSPACE", () => {
  it("clears the letter under the cursor and stays there", () => {
    const start = editing({ cells: { "0_0": "Α", "0_1": "Β" }, activeCellKey: "0_1" });
    const next = makerReducer(start, { type: "BACKSPACE" });
    expect(next.cells).toEqual({ "0_0": "Α" });
    expect(next.activeCellKey).toBe("0_1");
  });

  it("removes the key rather than blanking it", () => {
    const next = makerReducer(editing({ cells: { "0_0": "Α" } }), { type: "BACKSPACE" });
    expect("0_0" in next.cells).toBe(false);
  });

  it("steps back and clears the previous cell when the cursor sits on an empty one", () => {
    const start = editing({ cells: { "0_0": "Α" }, activeCellKey: "0_1" });
    const next = makerReducer(start, { type: "BACKSPACE" });
    expect(next.cells).toEqual({});
    expect(next.activeCellKey).toBe("0_0");
  });

  it("stops at the start of the run instead of reaching into the previous slot", () => {
    const start = editing({ cells: { "1_0": "Ζ" }, activeCellKey: "0_0" });
    const next = makerReducer(start, { type: "BACKSPACE" });
    expect(next.cells).toEqual({ "1_0": "Ζ" });
    expect(next.activeCellKey).toBe("0_0");
  });

  it("ignores a backspace with no cursor", () => {
    const start = editing({ selectedSlot: null, activeCellKey: null });
    expect(makerReducer(start, { type: "BACKSPACE" })).toBe(start);
  });
});

describe("SELECT_SLOT", () => {
  it("parks the cursor at the head of the chosen slot", () => {
    const next = makerReducer(editing(), { type: "SELECT_SLOT", number: 4, direction: "down" });
    expect(next.selectedSlot).toEqual({ number: 4, direction: "down" });
    expect(next.activeCellKey).toBe("0_3");
  });

  it("ignores a slot the grid does not have", () => {
    const start = editing();
    expect(makerReducer(start, { type: "SELECT_SLOT", number: 99, direction: "down" })).toBe(start);
  });
});

describe("SET_CLUE", () => {
  it("writes the clue against the selected slot", () => {
    const next = makerReducer(editing(), { type: "SET_CLUE", text: "Μια ερώτηση" });
    expect(next.clues).toEqual({ "1-across": "Μια ερώτηση" });
  });

  it("keys by direction, so the Across and Down of one number hold separate clues", () => {
    const withAcross = makerReducer(editing(), { type: "SET_CLUE", text: "Οριζόντια" });
    const onDown = { ...withAcross, selectedSlot: { number: 1, direction: "down" as const } };
    const both = makerReducer(onDown, { type: "SET_CLUE", text: "Κάθετη" });
    expect(both.clues).toEqual({ "1-across": "Οριζόντια", "1-down": "Κάθετη" });
  });

  it("ignores a clue typed with no slot selected", () => {
    const start = editing({ selectedSlot: null });
    expect(makerReducer(start, { type: "SET_CLUE", text: "Μια ερώτηση" })).toBe(start);
  });
});

describe("SET_SIZE", () => {
  it("resizes and clears — a different size is a different grid", () => {
    const start = editing({ blackSquares: [[1, 1]], cells: { "0_0": "Α" }, clues: { "1-across": "x" } });
    const next = makerReducer(start, { type: "SET_SIZE", size: 13 });
    expect(next.size).toBe(13);
    expect(next.blackSquares).toEqual([]);
    expect(next.cells).toEqual({});
    expect(next.clues).toEqual({});
    expect(next.selectedSlot).toBeNull();
  });
});

describe("phase transitions", () => {
  it("START_GRID opens the grid step", () => {
    expect(makerReducer(makeInitialMakerState(), { type: "START_GRID" }).phase).toBe(2);
  });

  it("ENTER_FILL opens the fill step on the first slot", () => {
    const start = { ...makeInitialMakerState(), phase: 2 as const, size: 5 };
    const next = makerReducer(start, { type: "ENTER_FILL" });
    expect(next.phase).toBe(3);
    expect(next.selectedSlot).toEqual({ number: 1, direction: "across" });
  });

  it("ENTER_FILL leaves the cursor off until a square is clicked", () => {
    // Long-standing behaviour, kept: entering the fill step highlights the run
    // but does not put a cursor in it, so the first keystroke needs a click to
    // aim it. Changing this is a UX decision, not part of extracting the rules.
    const start = { ...makeInitialMakerState(), phase: 2 as const, size: 5 };
    expect(makerReducer(start, { type: "ENTER_FILL" }).activeCellKey).toBeNull();
  });

  it("BACK_TO_GRID returns to the grid step with the work intact", () => {
    const start = editing({ cells: { "0_0": "Α" } });
    const next = makerReducer(start, { type: "BACK_TO_GRID" });
    expect(next.phase).toBe(2);
    expect(next.cells).toEqual({ "0_0": "Α" });
  });

  it("RESTART clears the grid but keeps the chosen size", () => {
    const start = editing({ size: 13, blackSquares: [[1, 1]], cells: { "0_0": "Α" }, clues: { "1-across": "x" } });
    const next = makerReducer(start, { type: "RESTART" });
    expect(next.phase).toBe(1);
    expect(next.size).toBe(13);
    expect(next.blackSquares).toEqual([]);
    expect(next.cells).toEqual({});
    expect(next.clues).toEqual({});
    expect(next.selectedSlot).toBeNull();
    expect(next.activeCellKey).toBeNull();
  });
});

describe("HYDRATE", () => {
  const stored = {
    width: 5,
    height: 5,
    blackSquares: [] as [number, number][],
    slots: [
      { number: 1, direction: "across" as const, startRow: 0, startCol: 0, answer: "ΑΒΓΔΕ", clue: "Πρώτη" },
      { number: 1, direction: "down"   as const, startRow: 0, startCol: 0, answer: "ΑΖΛΠΦ", clue: "" },
    ],
  };

  it("drops a resumed puzzle straight into the fill step", () => {
    const next = makerReducer(makeInitialMakerState(), { type: "HYDRATE", data: stored });
    expect(next.phase).toBe(3);
    expect(next.size).toBe(5);
    expect(next.selectedSlot).toEqual({ number: 1, direction: "across" });
  });

  it("spreads the stored answers and clues back over the grid", () => {
    const next = makerReducer(makeInitialMakerState(), { type: "HYDRATE", data: stored });
    expect(next.cells["0_4"]).toBe("Ε");
    expect(next.cells["4_0"]).toBe("Φ");
    expect(next.clues).toEqual({ "1-across": "Πρώτη" });
  });

  it("survives a stored puzzle with no slots", () => {
    const next = makerReducer(makeInitialMakerState(), {
      type: "HYDRATE",
      data: { ...stored, slots: [] },
    });
    expect(next.phase).toBe(3);
    expect(next.selectedSlot).toBeNull();
    expect(next.cells).toEqual({});
  });
});
