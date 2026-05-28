export type Direction = "across" | "down";

export interface SlotDef {
  number: number;
  direction: Direction;
  startRow: number;
  startCol: number;
  answer: string;
  clue: string;
}

export interface StavroleksoPuzzleData {
  width: number;
  height: number;
  blackSquares: [number, number][];
  slots: SlotDef[];
}

export interface StavroleksoSession {
  cells: Record<string, string>;
  solvedSlots: number[];
}
