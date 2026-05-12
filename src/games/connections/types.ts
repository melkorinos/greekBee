// Connections game — TypeScript types.
// No `language` field — Connections has no word-list dependency.

// ── Puzzle ────────────────────────────────────────────────────────────────────

/** Difficulty 1 = easiest (yellow), 4 = hardest (purple). */
export type ConnectionDifficulty = 1 | 2 | 3 | 4;

/** One solved group of exactly 4 words. */
export interface ConnectionGroup {
  category:   string;
  words:      [string, string, string, string];
  difficulty: ConnectionDifficulty;
}

/** A single day's Connections puzzle. */
export interface ConnectionsPuzzle {
  /** ISO date string "YYYY-MM-DD" — used to identify today's puzzle. */
  date:   string;
  groups: [ConnectionGroup, ConnectionGroup, ConnectionGroup, ConnectionGroup];
}

// ── State ─────────────────────────────────────────────────────────────────────

export type ConnectionsStatus = "playing" | "won" | "lost";

export interface ConnectionsState {
  puzzle:            ConnectionsPuzzle;
  /** Groups the player has correctly solved, in order of solving. */
  solvedGroups:      ConnectionGroup[];
  /** Words currently selected (max 4). */
  currentSelection:  string[];
  /** Wrong guesses remaining — starts at 4. */
  mistakesRemaining: number;
  status:            ConnectionsStatus;
  /** Transient feedback message — cleared after display. */
  lastFeedback:      string | null;
  /** History of submitted guesses (for replay / display). */
  guessHistory:      string[][];
}

// ── Persistence ───────────────────────────────────────────────────────────────

/** Only the durable parts of ConnectionsState are persisted. */
export interface ConnectionsPersistedState {
  date:              string;
  solvedGroups:      ConnectionGroup[];
  mistakesRemaining: number;
  status:            ConnectionsStatus;
  guessHistory:      string[][];
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type ConnectionsAction =
  | { type: "SELECT_WORD";    word: string }
  | { type: "SUBMIT_GUESS" }
  | { type: "SHUFFLE" }
  | { type: "CLEAR_FEEDBACK" };
