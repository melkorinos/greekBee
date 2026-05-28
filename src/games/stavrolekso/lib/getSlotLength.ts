import type { Direction } from "../types";

export function makeBlackSet(blackSquares: [number, number][]): Set<string> {
  return new Set(blackSquares.map(([r, c]) => `${r}_${c}`));
}

export function getSlotLength(
  direction: Direction,
  startRow: number,
  startCol: number,
  width: number,
  height: number,
  blackSet: Set<string>,
): number {
  let len = 0;
  if (direction === "across") {
    for (let c = startCol; c < width && !blackSet.has(`${startRow}_${c}`); c++) len++;
  } else {
    for (let r = startRow; r < height && !blackSet.has(`${r}_${startCol}`); r++) len++;
  }
  return len;
}

export function getSlotCells(
  direction: Direction,
  startRow: number,
  startCol: number,
  width: number,
  height: number,
  blackSet: Set<string>,
): string[] {
  const len = getSlotLength(direction, startRow, startCol, width, height, blackSet);
  const cells: string[] = [];
  for (let i = 0; i < len; i++) {
    const r = direction === "across" ? startRow : startRow + i;
    const c = direction === "across" ? startCol + i : startCol;
    cells.push(`${r}_${c}`);
  }
  return cells;
}
