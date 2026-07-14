// Leksoplegma — game-specific types.

/** One generated puzzle as stored in puzzles-el.json. */
export interface LeksoplegmaPuzzle {
  /** Stable generator id (not date-coupled — dates map to puzzles by rotation). */
  id:         string;
  /** One letter per tile; index = tile. Accent-free lowercase Greek. */
  letters:    string;
  /** Authored trace per required word — consecutive pairs are the drawn edges. */
  paths:      Record<string, number[]>;
  /** Words traceable along the required-edge graph, precomputed offline. */
  bonusWords: string[];
}

/** Full reducer state for a Leksoplegma round. */
export interface LeksoplegmaState {
  /** ISO date (YYYY-MM-DD) — the daily puzzle id used for persistence/scores. */
  puzzleId:      string;
  puzzle:        LeksoplegmaPuzzle;
  foundRequired: string[];
  foundBonus:    string[];
  /** Required words a hint was taken on — one hint per word, max. */
  hintsUsed:     string[];
  /** Shake flag — set by a rejected trace, cleared by the next accepted one. */
  wrongTrace:    boolean;
  status:        "playing" | "finished";
}
