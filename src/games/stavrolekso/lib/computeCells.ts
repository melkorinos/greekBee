// Cell-highlight projections shared by the Stavrolekso player and maker.
// These lived in StavroleksoGrid.tsx, which made them unreachable without
// mounting a React tree; they are pure and belong here.

import type { Direction, SlotDef } from "../types";

import { getSlotCells } from "./getSlotLength";

/** Cells of the currently selected slot — the blue run under the cursor. */
export function computeHighlightedCells(
  selectedSlot: { number: number; direction: Direction } | null,
  slots: SlotDef[],
  width: number,
  height: number,
  blackSet: Set<string>,
): Set<string> {
  if (!selectedSlot) return new Set();
  const slot = slots.find(
    (s) => s.number === selectedSlot.number && s.direction === selectedSlot.direction,
  );
  if (!slot) return new Set();
  return new Set(getSlotCells(slot.direction, slot.startRow, slot.startCol, width, height, blackSet));
}

/**
 * Cells of every solved slot — the green run behind a finished answer.
 * `solvedSlots` holds slot NUMBERS, and a number can name both an Across and a
 * Down starting at the same cell, so solving one lights every run it names.
 */
export function computeSolvedCells(
  solvedSlots: number[],
  slots: SlotDef[],
  width: number,
  height: number,
  blackSet: Set<string>,
): Set<string> {
  const solved = new Set<string>();
  const solvedSet = new Set(solvedSlots);
  for (const slot of slots) {
    if (!solvedSet.has(slot.number)) continue;
    for (const cell of getSlotCells(slot.direction, slot.startRow, slot.startCol, width, height, blackSet)) {
      solved.add(cell);
    }
  }
  return solved;
}
