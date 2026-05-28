// Vres Tin Frasi — game-specific TypeScript types.

// ─── Puzzle ───────────────────────────────────────────────────────────────────

/** A single daily Vres Tin Frasi puzzle. */
export interface VresTinFrasiPuzzle {
  /** Unique identifier, e.g. "2026-05-28-vresi" */
  id: string;
  /** ISO date string this puzzle is intended for */
  date: string;
  /** Display form of the phrase with accents, e.g. "Κάνε υπομονή ψυχή" */
  phrase: string;
  /** Normalized (accent-stripped, lowercase, ς→σ) words, derived at load time */
  normalizedWords: string[];
  /** Length of each word in the phrase — drives the guess grid structure */
  wordLengths: number[];
}

// ─── Guess evaluation ─────────────────────────────────────────────────────────

/** The result of evaluating a single letter in a phrase guess */
export type PhraseTileState =
  | "correct"        // Right letter, right position, right word (green)
  | "present"        // Right letter, wrong position — within same word (yellow)
  | "misplaced-word" // Right letter, but belongs to a different word (purple)
  | "absent"         // Letter not in the phrase at all (grey)
  | "empty"          // Not yet filled
  | "pending";       // Typed, not yet submitted

/** One evaluated phrase guess — one TileState array per word */
export interface PhraseGuessResult {
  words: string[];
  tiles: PhraseTileState[][];
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type VresTinFrasiStatus = "playing" | "won" | "lost";

export interface VresTinFrasiState {
  puzzle: VresTinFrasiPuzzle;
  guesses: PhraseGuessResult[];
  /** Typed letters per word for the current (unsubmitted) guess */
  currentWords: string[];
  /** Which word the cursor is currently in */
  currentWordIndex: number;
  status: VresTinFrasiStatus;
  lastMessage: string | null;
}

// ─── Keyboard letter state ────────────────────────────────────────────────────

/** Best known state for a letter, used to colour the on-screen keyboard. */
export type PhraseLetterState = "correct" | "present" | "misplaced-word" | "absent" | "unknown";

/** Map from letter → best known state */
export type PhraseLetterStateMap = Record<string, PhraseLetterState>;

// ─── Persistence snapshot ─────────────────────────────────────────────────────

export interface VresTinFrasiRoundSnapshot {
  guesses: PhraseGuessResult[];
  status:  VresTinFrasiStatus;
}
