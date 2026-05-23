// Leksindeseis game — TypeScript types.
// No `language` field — Leksindeseis has no word-list dependency.

// ── Puzzle ────────────────────────────────────────────────────────────────────

/** Difficulty 1 = easiest (yellow), 4 = hardest (purple). */
export type ConnectionDifficulty = 1 | 2 | 3 | 4;

/** One solved group of exactly 4 words. */
export interface LeksindeseisGroup {
  category:   string;
  words:      [string, string, string, string];
  difficulty: ConnectionDifficulty;
}

/** A single day's Leksindeseis puzzle. */
export interface LeksindeseisPuzzle {
  /** ISO date string "YYYY-MM-DD" — used to identify today's puzzle. */
  date:   string;
  groups: [LeksindeseisGroup, LeksindeseisGroup, LeksindeseisGroup, LeksindeseisGroup];
}

// ── State ─────────────────────────────────────────────────────────────────────

export type LeksindeseisStatus = "playing" | "won" | "lost";

export interface LeksindeseisState {
  puzzle:            LeksindeseisPuzzle;
  /** Groups the player has correctly solved, in order of solving. */
  solvedGroups:      LeksindeseisGroup[];
  /** Words currently selected (max 4). */
  currentSelection:  string[];
  /** Wrong guesses remaining — starts at 4. */
  mistakesRemaining: number;
  status:            LeksindeseisStatus;
  /** Transient feedback message — cleared after display. */
  lastFeedback:      string | null;
  /** History of submitted guesses (for replay / display). */
  guessHistory:      string[][];
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type LeksindeseisAction =
  | { type: "SELECT_WORD";    word: string }
  | { type: "SUBMIT_GUESS" }
  | { type: "SHUFFLE" }
  | { type: "CLEAR_FEEDBACK" }
  | { type: "RESTORE_STATE"; saved: LeksindeseisRoundSnapshot };

// ── Persistence snapshot ──────────────────────────────────────────────────────

/** Fields persisted for a single Leksindeseis round (written by useRoundPersistence). */
export interface LeksindeseisRoundSnapshot {
  solvedGroups:      LeksindeseisGroup[];
  mistakesRemaining: number;
  status:            LeksindeseisStatus;
  guessHistory:      string[][];
}
