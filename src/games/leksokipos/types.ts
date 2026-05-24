// Leksokipos-specific TypeScript types.
// All types here are scoped to this game — root src/types/index.ts only holds
// platform-wide types (Language, GameId, PersistenceEnvelope).

import type { Language } from "@/types";

// ─── Puzzle ───────────────────────────────────────────────────────────────────

/** A single daily Leksokipos puzzle definition. */
export interface LeksokiposPuzzle {
  /** Unique identifier for the puzzle (e.g. "2024-03-25-el") */
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
  | "Σπόρος"
  | "Βλαστός"
  | "Μπουμπούκι"
  | "Άνοιγμα"
  | "Ανθισμένο"
  | "Θαυμαστό"
  | "Ευφυΐα"
  | "Άνθος";

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

// ─── Persistence snapshot ─────────────────────────────────────────────────────

/** Fields persisted for a single Leksokipos round (written by useRoundPersistence). */
export interface LeksokiposRoundSnapshot {
  foundWords:  string[];
  score:       number;
  currentRank: RankName;
  startedAt:   number;
  givenUp:     boolean;
}

// ─── Game State ───────────────────────────────────────────────────────────────

/** The full game state managed by useReducer in the game hook */
export interface GameState {
  /** The active puzzle being played */
  puzzle: LeksokiposPuzzle;
  /** Letters the player has typed so far (not yet submitted) */
  currentInput: string;
  /** All words the player has successfully found, in submission order */
  foundWords: string[];
  /** Accumulated score for this session */
  score: number;
  /** The player's current rank based on their score */
  currentRank: RankName;
  /** Maximum achievable score for the active puzzle — computed once at puzzle load */
  puzzleMaxScore: number;
  /** Timestamp (ms) of when this game session started */
  startedAt: number;
  /** Result of the most recent word submission — used to drive UI feedback messages */
  lastSubmission: { word: string; result: ValidationResult } | null;
  /** True when the player has chosen to give up — locks the game permanently */
  givenUp?: boolean;
}
