// Πόσο κάνει; data types — the contract between the puzzle content (handoff 01)
// and the game logic (this handoff). Daily game: guess a supermarket product's
// price; higher/lower + proximity feedback over N guesses, shareable emoji grid.
//
// One static file backs the game: puzzles-el.json (an array of PosokaneiPuzzle,
// one per dated puzzle). A row graduates into it only when fully sourced (photo
// + reference price + source + date + band) — see handoff `posoKanei.md`.

/**
 * Whether the item is a brand-agnostic commodity or a specific SKU.
 * `generic` — produce priced by weight (αγγούρι, ντομάτα): no brand, generic
 * photo, wider tolerance band (the honest brand-agnostic price).
 * `specific` — a packaged good (γάλα, φέτα): names a brand + size and uses that
 * real SKU's reference price, tighter band. See handoff's commodity-vs-packaged
 * rule.
 */
export type PosokaneiItemType = "generic" | "specific";

/**
 * One dated puzzle. `price` is FROZEN at `sourceDate` from one named store —
 * never claimed as "current" (shown as `τιμή: X€ (πηγή, ημερομηνία)`). The
 * `photo` is an open-license / shoot-your-own image path (never the copyrighted
 * gov `image_url`), credited via `photoSource` + `photoLicense`.
 */
export interface PosokaneiPuzzle {
  /** Puzzle date (YYYY-MM-DD) — the daily identity. */
  date: string;
  /** Display item name, Greek (accents allowed — this is shown, not matched). */
  item: string;
  itemType: PosokaneiItemType;
  /** Brand + line for a specific SKU; omitted for a generic commodity. */
  brand?: string;
  /** Size / measure the price is for, e.g. "1kg", "1L", "τεμ". */
  unit: string;
  /** Reference price in euros, frozen at `sourceDate`. */
  price: number;
  /** Win tolerance as a fraction of `price` (e.g. 0.15 = ±15%). */
  band: number;
  /** Public path to the (open-license / own) photo, e.g. "/posokanei/foo.svg". */
  photo: string;
  /** Photo credit — where it came from (Wikimedia Commons, own shot, …). */
  photoSource: string;
  /** Photo licence text, rendered verbatim in How-to-Play (a CC obligation). */
  photoLicense: string;
  /** Which store's price this is (one named chain from the observatory). */
  sourceStore: string;
  /** The date the price was captured (YYYY-MM-DD). */
  sourceDate: string;
}

// ─── Gameplay types ─────────────────────────────────────────────────────────
// The pure-logic layer. Everything below is React-free.

/**
 * Where the true price sits relative to a guess: the answer is `higher` (guess
 * too low → aim up), `lower` (guess too high → aim down), or the guess landed
 * within the band (`correct`).
 */
export type PriceDirection = "higher" | "lower" | "correct";

/** One guess and its feedback. */
export interface PosokaneiGuessRecord {
  /** The guessed price in euros. */
  value: number;
  /** True when the guess landed within the puzzle's tolerance band. */
  correct: boolean;
  /** Which way the true price lies relative to the guess. */
  direction: PriceDirection;
  /** 0–100 closeness, scaled to PROXIMITY_MAX_REL (100 = exact, 0 = way off). */
  proximityPct: number;
}

/** Which stage the round is in. "finished" = solved or out of guesses/gave up. */
export type PosokaneiStage = "guessing" | "finished";

/** The full pure game state. Flags are DERIVED from `guesses` + `gaveUp`, so a
 * restore just replays the saved guess history (mirrors topothesies). */
export interface PosokaneiState {
  /** The target puzzle's id (its date) — the daily puzzle identity. */
  puzzleId: string;
  /** The puzzle being played. */
  target: PosokaneiPuzzle;
  guesses: PosokaneiGuessRecord[];
  stage: PosokaneiStage;
  /** Ended by landing within the band. */
  solved: boolean;
  /** Ended by exhausting all guesses (or giving up) without solving. */
  failed: boolean;
  /** The player gave up: the round is forced to finished and the price revealed. */
  gaveUp: boolean;
}
