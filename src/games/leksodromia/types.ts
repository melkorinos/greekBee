// Leksodromia — game-specific types.

import type { LEKSODROMIA } from "@/config/gameRules";

/** Word lengths played in a Leksodromia round (4–8). Tracks LEKSODROMIA.LENGTHS. */
export type LeksodromiaLength = (typeof LEKSODROMIA.LENGTHS)[number];

/** Outcome of one word in the round — the recap and score are built from these. */
export interface LeksodromiaWordResult {
  word:      string;
  status:    "solved" | "skipped";
  /** Active solve time in ms (clock pauses while the tab is hidden). */
  elapsedMs: number;
  hintsUsed: number;
  /** Decay-scored points; always 0 for a skip. */
  points:    number;
}

/** Full reducer state for a Leksodromia round. */
export interface LeksodromiaState {
  /** The puzzle date (YYYY-MM-DD) — deterministic daily puzzle id. */
  puzzleId:       string;
  /** The 10 answers, ascending by length (2 × 4–8 letters). */
  words:          string[];
  /** Deterministic scrambled form of each word (parallel to `words`). */
  scrambles:      string[];
  wordIndex:      number;
  status:         "playing" | "finished";
  /** Indices into the current scramble picked by the player, in order. */
  picked:         number[];
  /** Tiles consumed by hints — a locked prefix of correct letters. */
  lockedTileIdxs: number[];
  hintsUsed:      number;
  /** Shake flag — set by a wrong submit, cleared by the next input action. */
  wrongSubmit:    boolean;
  results:        LeksodromiaWordResult[];
}
