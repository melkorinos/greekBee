// Wordle GR — game-specific TypeScript types.
// Lives here in isolation; root src/types/index.ts only holds platform-wide types.

// ─── Puzzle ───────────────────────────────────────────────────────────────────

/** Supported word lengths for Wordle GR. Currently only 5 is active. */
export type WordleLength = 3 | 4 | 5 | 6 | 7 | 8;

/** A single daily Wordle puzzle. */
export interface WordlePuzzle {
  /** Unique identifier, e.g. "2026-05-12-wordle-5" */
  id: string;
  /** ISO date string this puzzle is intended for */
  date: string;
  /** The secret answer word (already normalised — no accents, final sigma → σ) */
  answer: string;
  /** Number of letters in the answer */
  length: WordleLength;
}

// ─── Guess evaluation ─────────────────────────────────────────────────────────

/** The result of evaluating a single letter in a guess */
export type TileState =
  | "correct"       // Right letter, right position (green)
  | "present"       // Right letter, wrong position (yellow)
  | "absent"        // Letter not in the answer (grey)
  | "empty"         // Not yet filled
  | "pending";      // Typed but not yet submitted

/** One evaluated guess row */
export interface GuessResult {
  word: string;
  tiles: TileState[];
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type WordleStatus = "playing" | "won" | "lost";

/** The full Wordle game state */
export interface WordleState {
  puzzle: WordlePuzzle;
  /** All submitted and evaluated guesses */
  guesses: GuessResult[];
  /** Letters the player has typed for the current (unsubmitted) guess */
  currentInput: string;
  /** Overall game status */
  status: WordleStatus;
  /** Feedback message for the last action (e.g. "Not in word list") */
  lastMessage: string | null;
}

// ─── Keyboard letter state ────────────────────────────────────────────────────

/**
 * The best known state for a letter across all submitted guesses.
 * Used to colour the on-screen keyboard.
 */
export type LetterState = "correct" | "present" | "absent" | "unknown";

/** Map from letter → best known state, for the keyboard display */
export type LetterStateMap = Record<string, LetterState>;

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Points awarded per number of guesses used (1 = best, 6 = worst, 0 = failed) */
export const WORDLE_SCORES: Record<number, number> = {
  1: 6,
  2: 5,
  3: 4,
  4: 3,
  5: 2,
  6: 1,
};

