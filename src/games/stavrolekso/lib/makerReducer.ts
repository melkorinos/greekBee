// Stavrolekso maker — the pure editing rules behind the grid editor.
//
// Every rule that decides what a click or a keystroke does to the grid lives
// here. The page owns layout, the network, and the two things a reducer cannot
// see: whether the clue input has focus, and blurring it.
//
// Slot numbering is DERIVED, never carried: `slots` and the black set are
// recomputed from `size` + `blackSquares` inside each action. A 15×15 board is
// 225 cells, so the cost is nothing, and it removes the failure mode where a
// caller passes a numbering that no longer matches the grid.

import { STAVROLEKSO } from "@/config/gameRules";

import type { Direction, MakerState, SlotDef, StavroleksoPuzzleData } from "../types";

import { autoNumberSlots } from "./autoNumberSlots";
import { getSlotCells, makeBlackSet } from "./getSlotLength";
import { clueKey, restoreCellsFromSlots } from "./makerSlots";

export type MakerAction =
  | { type: "TOGGLE_BLACK"; row: number; col: number }
  | { type: "SELECT_CELL"; row: number; col: number }
  | { type: "TYPE_LETTER"; key: string }
  | { type: "BACKSPACE" }
  | { type: "SELECT_SLOT"; number: number; direction: Direction }
  | { type: "SET_CLUE"; text: string }
  | { type: "SET_SIZE"; size: number }
  | { type: "START_GRID" }
  | { type: "ENTER_FILL" }
  | { type: "BACK_TO_GRID" }
  | { type: "RESTART" }
  | { type: "HYDRATE"; data: StavroleksoPuzzleData };

/**
 * A single Greek or Latin capital. Accented input is rejected on purpose —
 * puzzle letters are stored unaccented platform-wide, and silently stripping
 * the accent here would hide a wrong keyboard layout from the author.
 */
const LETTER = /^[Α-ΩA-Z]$/u;

/**
 * Whether a `KeyboardEvent.key` is one the grid will take. Exported so the page
 * can swallow exactly the keystrokes the reducer acts on, without keeping a
 * second copy of the rule that could drift from this one.
 */
export function isLetterKey(key: string): boolean {
  return LETTER.test(key.toUpperCase());
}

/** A fresh board: the smallest legal size, nothing drawn, nothing typed. */
export function makeInitialMakerState(): MakerState {
  return {
    phase: 1,
    size: STAVROLEKSO.VALID_GRID_SIZES[0],
    blackSquares: [],
    cells: {},
    clues: {},
    selectedSlot: null,
    activeCellKey: null,
  };
}

/** The grid's slots as currently numbered. */
export function getSlots(state: MakerState): SlotDef[] {
  return autoNumberSlots(state.size, state.size, state.blackSquares);
}

/** Cell keys of a slot's run, in reading order. */
function cellsOf(state: MakerState, slot: { direction: Direction; startRow: number; startCol: number }): string[] {
  return getSlotCells(
    slot.direction, slot.startRow, slot.startCol,
    state.size, state.size, makeBlackSet(state.blackSquares),
  );
}

/**
 * Where the cursor actually is: the live slot, its run, and the cursor's index
 * along it. Null when nothing is selected or when the selected slot has been
 * renumbered out of existence — either way there is nothing to type into.
 */
function readCursor(state: MakerState): {
  slot: SlotDef;
  slotCells: string[];
  cellIdx: number;
  activeCellKey: string;
} | null {
  const { selectedSlot, activeCellKey } = state;
  if (!selectedSlot || !activeCellKey) return null;

  const slot = getSlots(state).find(
    (s) => s.number === selectedSlot.number && s.direction === selectedSlot.direction,
  );
  if (!slot) return null;

  const slotCells = cellsOf(state, slot);
  return { slot, slotCells, cellIdx: slotCells.indexOf(activeCellKey), activeCellKey };
}

/** Everything drawn or typed, cleared — keeping the size and the phase. */
function emptyGrid(state: MakerState): MakerState {
  return { ...state, blackSquares: [], cells: {}, clues: {}, selectedSlot: null, activeCellKey: null };
}

export function makerReducer(state: MakerState, action: MakerAction): MakerState {
  switch (action.type) {

    case "TOGGLE_BLACK": {
      const { row, col } = action;
      const exists = state.blackSquares.some(([r, c]) => r === row && c === col);
      const blackSquares: [number, number][] = exists
        ? state.blackSquares.filter(([r, c]) => !(r === row && c === col))
        : [...state.blackSquares, [row, col]];

      // Reshaping renumbers the grid, so every letter and clue is orphaned:
      // a clue keyed "3-across" would silently re-point at a different run.
      // Clearing is the honest outcome, and the author is still in phase 2.
      return { ...state, blackSquares, cells: {}, clues: {}, selectedSlot: null, activeCellKey: null };
    }

    case "SELECT_CELL": {
      const key = `${action.row}_${action.col}`;
      if (makeBlackSet(state.blackSquares).has(key)) return state;

      // Reading order, so a cell shared by an Across and a Down always offers
      // the same two in the same sequence however it was reached.
      const through = getSlots(state).filter((s) => cellsOf(state, s).includes(key));
      if (through.length === 0) return state;

      // Clicking the cell you are already on rotates through its slots — the
      // only way to reach a Down without leaving the square you want to type in.
      const current = state.selectedSlot
        ? through.findIndex((s) => s.number === state.selectedSlot!.number && s.direction === state.selectedSlot!.direction)
        : -1;
      const picked = current !== -1
        ? through[(current + 1) % through.length]
        : through.find((s) => s.direction === "across") ?? through[0];

      return {
        ...state,
        selectedSlot:  { number: picked.number, direction: picked.direction },
        activeCellKey: key,
      };
    }

    case "TYPE_LETTER": {
      if (!isLetterKey(action.key)) return state;
      const letter = action.key.toUpperCase();

      const cursor = readCursor(state);
      if (!cursor) return state;
      const { slot, slotCells, cellIdx, activeCellKey } = cursor;

      const cells = { ...state.cells, [activeCellKey]: letter };

      // Mid-run: step to the next square.
      if (cellIdx < slotCells.length - 1) {
        return { ...state, cells, activeCellKey: slotCells[cellIdx + 1] };
      }

      // End of the run: hand the cursor to the next NUMBER, taking whichever
      // direction that number offers first. Numbers, not array position — the
      // author is walking the clue list, which is numbered.
      const numbers = [...new Set(getSlots(state).map((s) => s.number))];
      const nextNumber = numbers[numbers.indexOf(slot.number) + 1];
      const nextSlot = getSlots(state).find((s) => s.number === nextNumber);
      if (!nextSlot) return { ...state, cells };

      return {
        ...state,
        cells,
        selectedSlot:  { number: nextSlot.number, direction: nextSlot.direction },
        activeCellKey: cellsOf(state, nextSlot)[0] ?? null,
      };
    }

    case "BACKSPACE": {
      const cursor = readCursor(state);
      if (!cursor) return state;
      const { slotCells, cellIdx, activeCellKey } = cursor;

      // Clear under the cursor if there is something there; otherwise back up
      // and clear that. The run is the boundary — backspacing off the front of
      // a slot must not eat the end of whichever slot happens to precede it.
      const target = state.cells[activeCellKey] ? activeCellKey
        : cellIdx > 0 ? slotCells[cellIdx - 1]
        : null;
      if (!target) return state;

      const cells = { ...state.cells };
      delete cells[target];
      return { ...state, cells, activeCellKey: target };
    }

    case "SELECT_SLOT": {
      const slot = getSlots(state).find(
        (s) => s.number === action.number && s.direction === action.direction,
      );
      if (!slot) return state;
      return {
        ...state,
        selectedSlot:  { number: slot.number, direction: slot.direction },
        activeCellKey: cellsOf(state, slot)[0] ?? null,
      };
    }

    case "SET_CLUE": {
      // The clue bar edits whatever is selected — there is no other way to aim
      // it, so an unselected board has nothing to write to.
      if (!state.selectedSlot) return state;
      const key = clueKey(state.selectedSlot.number, state.selectedSlot.direction);
      return { ...state, clues: { ...state.clues, [key]: action.text } };
    }

    case "SET_SIZE":
      // Same reasoning as TOGGLE_BLACK, one step harder: a resized board
      // renumbers everything and can put a black square off the edge.
      return { ...emptyGrid(state), size: action.size };

    case "START_GRID":
      return { ...state, phase: 2 };

    case "ENTER_FILL": {
      // Highlight the first run so the clue bar has something to show. The
      // cursor stays off until a square is clicked.
      const first = getSlots(state)[0];
      return {
        ...state,
        phase: 3,
        selectedSlot: first ? { number: first.number, direction: first.direction } : null,
      };
    }

    case "BACK_TO_GRID":
      return { ...state, phase: 2 };

    case "RESTART":
      // Start the grid over, keeping the size the author already picked.
      return { ...emptyGrid(state), phase: 1 };

    case "HYDRATE": {
      const { width, blackSquares, slots } = action.data;
      const { cells, clues } = restoreCellsFromSlots(width, blackSquares, slots);
      const first = slots[0];
      return {
        phase: 3,
        size: width,
        blackSquares,
        cells,
        clues,
        selectedSlot: first ? { number: first.number, direction: first.direction } : null,
        activeCellKey: null,
      };
    }

    default:
      return state;
  }
}
