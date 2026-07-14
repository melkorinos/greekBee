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
  MAX_SCORE_CAP:   600,
  SCORE_SCALE:     0.85,
} as const;

export const LEKSIARXEIO = {
  MAX_GUESSES: 6,
  LENGTHS:     [4, 5, 6, 7, 8] as const,
} as const;

export const VRESTIFRASI = {
  MAX_GUESSES: 6,
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
