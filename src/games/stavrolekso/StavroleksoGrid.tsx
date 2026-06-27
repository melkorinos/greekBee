"use client";

import { useMemo } from "react";
import type { Direction, SlotDef } from "./types";
import { makeBlackSet, getSlotCells } from "./lib";

interface StavroleksoGridProps {
  width: number;
  height: number;
  blackSquares: [number, number][];
  slots: SlotDef[];
  cellValues: Record<string, string>;
  /** Keys of cells in the currently selected slot — highlighted blue */
  highlightedCells?: Set<string>;
  /** The specific cell where the cursor is — darker blue */
  activeCellKey?: string | null;
  /** Keys of cells belonging to correctly solved slots — highlighted green */
  solvedCells?: Set<string>;
  /** Keys of cells whose slot word is not in the dictionary — highlighted yellow (maker only) */
  warnedCells?: Set<string>;
  onCellClick?: (row: number, col: number) => void;
}

export function StavroleksoGrid({
  width,
  height,
  blackSquares,
  slots,
  cellValues,
  highlightedCells,
  activeCellKey,
  solvedCells,
  warnedCells,
  onCellClick,
}: StavroleksoGridProps) {
  const blackSet = useMemo(() => makeBlackSet(blackSquares), [blackSquares]);

  // Map each cell key to its slot number (for rendering the corner label)
  const cellNumbers = useMemo(() => {
    const map = new Map<string, number>();
    for (const slot of slots) {
      const key = `${slot.startRow}_${slot.startCol}`;
      if (!map.has(key)) map.set(key, slot.number);
    }
    return map;
  }, [slots]);

  const cells = useMemo(() => {
    const list: { row: number; col: number; key: string }[] = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        list.push({ row: r, col: c, key: `${r}_${c}` });
      }
    }
    return list;
  }, [width, height]);

  return (
    <div
      className="w-full border border-stone-400 dark:border-stone-600 select-none"
      style={{ display: "grid", gridTemplateColumns: `repeat(${width}, 1fr)` }}
      role="grid"
      aria-label="Σταυρόλεξο"
    >
      {cells.map(({ row, col, key }) => {
        const isBlack = blackSet.has(key);
        const number  = cellNumbers.get(key);
        const letter  = cellValues[key] ?? "";

        if (isBlack) {
          return (
            <div
              key={key}
              role="gridcell"
              className="aspect-square bg-stone-900 dark:bg-stone-950 border border-stone-700"
              onClick={() => onCellClick?.(row, col)}
            />
          );
        }

        const isSolved      = solvedCells?.has(key);
        const isHighlighted = highlightedCells?.has(key);
        const isActive      = activeCellKey === key;
        const isWarned      = warnedCells?.has(key);

        // INTENTIONAL fixed "paper" palette (ADR 0008 exception): the crossword
        // grid stays a light paper sheet in BOTH themes (cells go white→stone-100,
        // not white→dark-surface), so these are NOT semantic surface tokens. The
        // solved/active/warn highlights are pale paper tints, deliberately distinct
        // from the solid feedback tokens used by the Wordle-style games.
        let bg = "bg-white dark:bg-stone-100";
        if (isWarned)      bg = "bg-yellow-100 dark:bg-yellow-200";
        if (isSolved)      bg = "bg-green-200 dark:bg-green-300";
        if (isHighlighted) bg = "bg-blue-100 dark:bg-blue-200";
        if (isActive)      bg = "bg-blue-300 dark:bg-blue-400";

        return (
          <div
            key={key}
            role="gridcell"
            className={`aspect-square relative border border-stone-300 dark:border-stone-400 cursor-pointer ${bg} flex items-center justify-center`}
            onClick={() => onCellClick?.(row, col)}
          >
            {number !== undefined && (
              <span className="absolute top-0 left-0 text-[7px] leading-none font-semibold text-stone-600 dark:text-stone-700 px-px pt-px">
                {number}
              </span>
            )}
            <span className="text-stone-900 font-bold leading-none"
              style={{ fontSize: `clamp(8px, ${90 / width}cqw, 18px)` }}
            >
              {letter}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Helper exported for use in maker + player ─────────────────────────────────

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
