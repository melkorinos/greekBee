import { STAVROLEKSO } from "@/config/gameRules";

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

/** The three steps of authoring: pick a size, shape the grid, fill it in. */
export type MakerPhase = 1 | 2 | 3;

export type GridSize = (typeof STAVROLEKSO.VALID_GRID_SIZES)[number];

/**
 * Everything the maker's grid editor decides. Deliberately excludes the
 * puzzle's metadata (title, author, edit PIN) and the submit lifecycle
 * (in-flight, error, confirmation) — those are the page's, not the grid's.
 *
 * `size` is typed wider than `GridSize` so tests can drive a small board; the
 * size picker is what constrains a real author to the three legal sizes.
 */
export interface MakerState {
  phase: MakerPhase;
  size: number;
  blackSquares: [number, number][];
  /** `"row_col"` → the letter typed there. Absent means empty, never `""`. */
  cells: Record<string, string>;
  /** `clueKey(number, direction)` → the clue written for that slot. */
  clues: Record<string, string>;
  selectedSlot: { number: number; direction: Direction } | null;
  /** The one cell the cursor sits on, always inside `selectedSlot`. */
  activeCellKey: string | null;
}
