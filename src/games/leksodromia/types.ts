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

/**
 * Second-chance metadata for a requeued (skipped-once) word, keyed by its
 * step index past the base words. The decay clock and hint count RESUME from
 * these bases on the revisit — otherwise skipping would reset the decay
 * (peek → skip → solve offline → return for near-full points).
 */
export interface LeksodromiaRetry {
  /** Index of the original word in `words`/`scrambles`. */
  origIndex:     number;
  /** Accumulated active solve time when the word was skipped. */
  baseElapsedMs: number;
  /** Hints already taken on the word when it was skipped. */
  baseHints:     number;
}

/** Full reducer state for a Leksodromia round. */
export interface LeksodromiaState {
  /** The puzzle date (YYYY-MM-DD) — deterministic daily puzzle id. */
  puzzleId:       string;
  /** The 10 answers, ascending by length (2 × 4–8 letters). */
  words:          string[];
  /** Deterministic scrambled form of each word (parallel to `words`). */
  scrambles:      string[];
  /** Current step: 0..words.length-1 = first pass; beyond = second-chance steps. */
  wordIndex:      number;
  /** Second-chance steps (see LeksodromiaRetry), keyed by step index. */
  retries:        Record<number, LeksodromiaRetry>;
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
