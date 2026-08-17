// The maker's save/resume round-trip.
//
// While authoring, the grid is a flat cell map (`"row_col" → letter`) plus a
// clue map keyed by slot. The wire format the API stores is a list of slots,
// each holding a whole answer string. `assembleSlots` writes that format,
// `restoreCellsFromSlots` reads it back, and resuming a puzzle by ID runs both
// in sequence — so they are inverses or a resumed puzzle comes back scrambled.

import type { Direction, SlotDef } from "../types";

import { autoNumberSlots } from "./autoNumberSlots";
import { getSlotCells, makeBlackSet } from "./getSlotLength";

/**
 * Key a clue by the slot it answers. A number alone is not enough — one number
 * can name both an Across and a Down starting at the same cell.
 */
export function clueKey(number: number, direction: Direction): string {
  return `${number}-${direction}`;
}

/**
 * Project the edited grid onto the wire format: every auto-numbered slot with
 * the letters typed into its run and the clue written against it.
 *
 * An untyped cell contributes nothing rather than a blank, so a slot with a
 * hole in it comes back SHORTER than its run. That is deliberate — it is the
 * signal the submit gate uses to refuse a half-filled slot.
 */
export function assembleSlots(
  size: number,
  blackSquares: [number, number][],
  cells: Record<string, string>,
  clues: Record<string, string>,
): SlotDef[] {
  const blackSet = makeBlackSet(blackSquares);
  return autoNumberSlots(size, size, blackSquares).map((slot) => {
    const slotCells = getSlotCells(slot.direction, slot.startRow, slot.startCol, size, size, blackSet);
    return {
      ...slot,
      answer: slotCells.map((k) => cells[k] ?? "").join(""),
      clue:   clues[clueKey(slot.number, slot.direction)] ?? "",
    };
  });
}

/**
 * Read a stored puzzle back into the maps the maker edits.
 *
 * Positions come from the STORED slots, not from re-numbering the grid: a
 * resumed puzzle must land where its author put it. Letters past the end of a
 * run are dropped rather than written into a black square.
 *
 * This is the inverse of `assembleSlots` only for a COMPLETE grid. A slot with
 * a hole was already collapsed on the way out, so the letters come back
 * left-packed. Nothing gappy can be stored — the submit gate refuses a slot
 * shorter than its run — which is the whole reason that gate exists.
 */
export function restoreCellsFromSlots(
  size: number,
  blackSquares: [number, number][],
  slots: SlotDef[],
): { cells: Record<string, string>; clues: Record<string, string> } {
  const blackSet = makeBlackSet(blackSquares);
  const cells: Record<string, string> = {};
  const clues: Record<string, string> = {};

  for (const slot of slots) {
    const slotCells = getSlotCells(slot.direction, slot.startRow, slot.startCol, size, size, blackSet);
    [...slot.answer].forEach((letter, i) => {
      if (slotCells[i]) cells[slotCells[i]] = letter;
    });
    if (slot.clue) clues[clueKey(slot.number, slot.direction)] = slot.clue;
  }

  return { cells, clues };
}
