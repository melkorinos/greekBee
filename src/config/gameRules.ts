/**
 * Platform-wide game rule constants — every numeric tuning knob lives here.
 * Each object is named after its game so callers import only what they need.
 * Change a value here; all consumers pick it up automatically.
 */

export const LEKSOKIPOS = {
  MIN_WORD_LENGTH: 4,
  PANGRAM_BONUS:   7,
  MAX_SCORE_CAP:   500,
  SCORE_SCALE:     0.8,
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
