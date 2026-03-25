// Shared TypeScript types and interfaces for the Spelling Bee game.
// All game-wide types are exported from here so imports stay clean.

// ─── Language ────────────────────────────────────────────────────────────────

/** Supported game languages. Adding a new language only requires a new entry here
 *  plus the matching word list JSON and puzzle data file. */
export type Language = "en" | "el";

// ─── Puzzle ───────────────────────────────────────────────────────────────────

/** A single daily puzzle definition.
 *  This is loaded from a JSON file in src/data/ at runtime. */
export interface Puzzle {
  /** Unique identifier for the puzzle (e.g. "2024-03-25-en") */
  id: string;
  /** The language this puzzle belongs to */
  language: Language;
  /** The mandatory center letter — every valid word must contain this */
  centerLetter: string;
  /** The 6 outer letters (does NOT include the center letter) */
  outerLetters: string[];
  /** Full set of accepted answers for this puzzle */
  validWords: string[];
  /** Date this puzzle is intended for (ISO string, e.g. "2024-03-25") */
  date: string;
}

// ─── Scoring & Ranks ─────────────────────────────────────────────────────────

/** Player rank thresholds, ordered from lowest to highest.
 *  Ranks are calculated as a percentage of the maximum possible score. */
export type RankName =
  | "Beginner"
  | "Good Start"
  | "Moving Up"
  | "Good"
  | "Solid"
  | "Nice"
  | "Great"
  | "Amazing"
  | "Genius"
  | "Queen Bee";

/** A rank definition with its minimum score percentage threshold */
export interface Rank {
  name: RankName;
  /** Minimum percentage of total possible score required to reach this rank (0–100) */
  threshold: number;
}

// ─── Word Validation ─────────────────────────────────────────────────────────

/** Possible outcomes when a player submits a word */
export type ValidationStatus =
  | "valid"          // Word accepted, adds to found list
  | "already_found"  // Word was already submitted
  | "too_short"      // Fewer than 4 letters
  | "missing_center" // Doesn't contain the center letter
  | "invalid_letter" // Contains a letter not in the puzzle
  | "not_in_list";   // Not in the valid word list

/** Result returned by the word validator */
export interface ValidationResult {
  status: ValidationStatus;
  /** Points awarded (0 for any non-valid status) */
  points: number;
  /** True when the word uses all 7 puzzle letters */
  isPangram: boolean;
}

// ─── Game State ───────────────────────────────────────────────────────────────

/** The full game state managed by useReducer in the game hook */
export interface GameState {
  /** The active puzzle being played */
  puzzle: Puzzle;
  /** Letters the player has typed so far (not yet submitted) */
  currentInput: string;
  /** All words the player has successfully found, in submission order */
  foundWords: string[];
  /** Accumulated score for this session */
  score: number;
  /** The player's current rank based on their score */
  currentRank: RankName;
  /** Timestamp (ms) of when this game session started */
  startedAt: number;
}
