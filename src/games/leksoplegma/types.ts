// Leksoplegma — game-specific types.

/** One generated puzzle as stored in puzzles-el.json. */
export interface LeksoplegmaPuzzle {
  /** Stable generator id (not date-coupled — dates map to puzzles by rotation). */
  id:         string;
  /** One letter per tile; index = tile. Accent-free lowercase Greek. */
  letters:    string;
  /** Authored trace per required word — consecutive pairs are the drawn edges. */
  paths:      Record<string, number[]>;
  /**
   * Every extra valid word traceable along the required-edge web, precomputed
   * by the generator against words-el. Runtime game element: each scores flat
   * BONUS_WORD_POINTS and stays findable all round (soft collapse — cleared
   * edges dim but remain traceable).
   */
  bonusWords: string[];
}

/** Full reducer state for a Leksoplegma round. */
export interface LeksoplegmaState {
  /** ISO date (YYYY-MM-DD) — the daily puzzle id used for persistence/scores. */
  puzzleId:      string;
  puzzle:        LeksoplegmaPuzzle;
  foundRequired: string[];
  /** Extra words (puzzle.bonusWords) found so far — points only, never gate completion. */
  foundBonus:    string[];
  /** Required words a hint was taken on — one hint per word, max. */
  hintsUsed:     string[];
  /** Shake flag — set by a rejected trace, cleared by the next accepted one. */
  wrongTrace:    boolean;
  status:        "playing" | "finished";
}
