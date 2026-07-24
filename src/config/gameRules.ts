/**
 * Platform-wide game rule constants — every numeric tuning knob lives here.
 * Each object is named after its game so callers import only what they need.
 * Change a value here; all consumers pick it up automatically.
 */

// Achievement trigger/scale/rate knobs live in src/config/achievementTuning.ts,
// kept separate so balancing is a single-file edit.
export const LEKSOKIPOS = {
  MIN_WORD_LENGTH: 4,
  PANGRAM_BONUS:   7,
  SCORE_SCALE:     0.85,
  // Soft cap on a puzzle's rank-defining max score. Below SOFT_CAP_KNEE the
  // scaled score passes through unchanged; above it the excess is compressed
  // logarithmically toward the theoretical max — no hard ceiling — so the
  // genius bar keeps rising with each puzzle's richness (giving day-to-day
  // variety) while a word-dense "monster" garden never demands a runaway total.
  // SOFT_CAP_K sets the compression strength (higher = more headroom for big
  // puzzles). See softCap() in games/leksokipos/lib/scoring.ts.
  SOFT_CAP_KNEE:   400,
  SOFT_CAP_K:      250,
} as const;

export const LEKSIARXEIO = {
  MAX_GUESSES: 6,
  LENGTHS:     [4, 5, 6, 7, 8] as const,
} as const;

export const VRESTIFRASI = {
  MAX_GUESSES: 6,
  // Guess-word pool lengths this game owns. A phrase guess is validated word by
  // word against pools covering 2–8 letters: 4–8 are Leksiarxeio's guess lists
  // (LEKSIARXEIO.LENGTHS), reused read-only, while these two exist only for Vres
  // Tin Frasi — its phrases are full of short function words (δες, πες, ντε,
  // βρε) that Leksiarxeio is never played at. Must stay DISJOINT from
  // LEKSIARXEIO.LENGTHS: each length has exactly one owning re-sync adapter
  // (ADR 0015), and resyncVrestifrasi.test.ts pins that.
  SHORT_WORD_LENGTHS: [2, 3] as const,
} as const;

export const LEKSINDESEIS = {
  MAX_MISTAKES: 4,
} as const;

export const STAVROLEKSO = {
  VALID_GRID_SIZES: [9, 13, 15] as const,
} as const;

export const LEKSOPLEGMA = {
  REQUIRED_WORDS:     9,    // generator target per puzzle
  GRID_SIZE:          16,   // 4×4
  POINTS_PER_LETTER:  10,   // required word = length × 10
  BONUS_WORD_POINTS:  25,   // flat — bonus pools vary per puzzle; flat keeps variance sane
  HINT_COST_POINTS:   25,
  MAX_HINTS_PER_WORD: 1,    // hint = reveal a word's start tile + length
  SCORE_FLOOR:        0,    // hints can never take the total below 0
} as const;

export const TOPOTHESIES = {
  // Stage 1: guess the regional unit from its silhouette.
  SHAPE_GUESSES:   5,
  // Stage 2 (bonus): guess that unit's capital.
  CAPITAL_GUESSES: 3,
  // Scoring: points scale with guesses remaining at the moment of the correct
  // guess. Shape stage is the main event; capital stage is a smaller bonus.
  POINTS_PER_SHAPE_GUESS_LEFT:   100,  // ×(SHAPE_GUESSES − wrongShapeGuesses)
  POINTS_PER_CAPITAL_GUESS_LEFT: 40,   // ×(CAPITAL_GUESSES − wrongCapitalGuesses)
  // Proximity hint scaling: distance/proximity% are scaled to the dataset's
  // real max pairwise centroid distance, NOT the globe. Computed by the data
  // pipeline (scripts/generateTopothesies.ts) from the emitted answers.json.
  PROXIMITY_MAX_KM: 938,
} as const;

export const POSOKANEI = {
  // Daily "guess the supermarket price" game. N guesses; win = land within the
  // puzzle's own tolerance band (a per-puzzle fraction of the price, so generic
  // commodities can carry a wider band than specific SKUs — set in the data).
  MAX_GUESSES: 6,
  // Scoring: points scale with guesses remaining at the correct guess (solve on
  // the first try → full points; each earlier wrong guess costs one step).
  POINTS_PER_GUESS_LEFT: 100,  // ×(MAX_GUESSES − wrongGuesses)
  // Proximity hint scaling: closeness% is 1 − (relativeError / PROXIMITY_MAX_REL),
  // clamped to 0–100. A guess off by this fraction of the price (or more) reads
  // 0%; an exact guess reads 100%. Kept generous so early guesses feel informative.
  PROXIMITY_MAX_REL: 1.0,      // 100% relative error → 0% proximity
  // Share-grid tier: a wrong guess at/above this proximity is a "close" 🟨,
  // below it a "far" ⬛ (a correct guess is always 🟩). Purely cosmetic.
  CLOSE_PROXIMITY_PCT: 70,
} as const;

export const LEKSODROMIA = {
  WORDS_PER_LENGTH:   2,
  LENGTHS:            [4, 5, 6, 7, 8] as const,   // mirrors LEKSIARXEIO.LENGTHS
  BASE_POINTS:        { 4: 60, 5: 80, 6: 100, 7: 120, 8: 140 } as const,
  DECAY_SECONDS:      45,     // time to reach the floor
  FLOOR_RATIO:        0.25,   // floor = 25% of BASE
  HINT_COST_RATIO:    0.30,   // each hint −30% of BASE
  MAX_HINTS_PER_WORD: 2,
  MIN_SOLVED_POINTS:  5,      // a solved word always beats a skip (0)
  MAX_SCORE:          1000,   // perfect round: 2 × (60+80+100+120+140)
} as const;
