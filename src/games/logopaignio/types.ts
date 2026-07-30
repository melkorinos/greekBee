// Λογοπαίγνιο data types — the contract between the puzzle content (a curated
// brand list) and the game logic. Daily game: a Greek company's logo MARK is
// shown name-stripped and progressively de-blurred; the player types the brand
// name letter-for-letter; fewer reveals = more points; the share row is
// spoiler-free. Mirrors posokanei/topothesies (daily + one asset + share grid).
//
// One static file backs the game: puzzles-el.json (an array of LogopaignioPuzzle).
// A row graduates in only when fully sourced (mark asset + accept-list + credit)
// — see handoff `logopaignio-content-pool.md`.

/**
 * One brand puzzle. `brand` is the canonical display name (revealed only after a
 * solve or give-up); `accept` is the curated set of spellings we accept, and it
 * MUST cover the Greek⇄Latin fork (e.g. both "Cosmote" and "Κοσμοτε") — plain
 * accent/case/whitespace normalisation can't bridge two different alphabets.
 * `sector` is a permanent free hint (e.g. «Σούπερ μάρκετ»). `date` is optional:
 * when present it pins the puzzle to a calendar day, otherwise the puzzle only
 * surfaces through the daily rotation (selectDailyPuzzle).
 */
export interface LogopaignioPuzzle {
  /** Stable puzzle identity (the daily/persistence key). */
  id: string;
  /** Optional calendar pin (YYYY-MM-DD); absent rows surface via rotation only. */
  date?: string;
  /** Canonical brand name, shown only after the round ends. */
  brand: string;
  /** Permanent free hint — the brand's sector, e.g. «Σούπερ μάρκετ». */
  sector: string;
  /** Accepted spellings (Greek form, Latin form, common variants). */
  accept: string[];
  /** Public path to the name-stripped mark, e.g. "/logopaignio/foo.svg". */
  markAsset: string;
  /** Mark attribution / source, kept for the takedown-readiness note. */
  credit?: string;
}

// ─── Gameplay types ─────────────────────────────────────────────────────────
// The pure-logic layer. Everything below is React-free.

/** One guess and whether it matched the brand. */
export interface LogopaignioGuessRecord {
  /** The raw typed guess (kept so RESTORE can replay and share can count). */
  input: string;
  /** True when the guess matched an accepted spelling. */
  correct: boolean;
}

/** Which stage the round is in. "finished" = solved or out of guesses/gave up. */
export type LogopaignioStage = "guessing" | "finished";

/**
 * The full pure game state. Flags are DERIVED from `guesses` + `gaveUp`, so a
 * restore just replays the saved guess history (mirrors topothesies/posokanei).
 */
export interface LogopaignioState {
  /** The target puzzle's id — the daily/persistence identity. */
  puzzleId: string;
  /** The puzzle being played. */
  target: LogopaignioPuzzle;
  guesses: LogopaignioGuessRecord[];
  stage: LogopaignioStage;
  /** Ended by a correct guess. */
  solved: boolean;
  /** Ended by exhausting all guesses (or giving up) without solving. */
  failed: boolean;
  /** The player gave up: the round is forced to finished and the mark revealed. */
  gaveUp: boolean;
}
