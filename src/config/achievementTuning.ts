/**
 * Achievement balancing knobs — every trigger threshold, scale, and rate an
 * achievement fires on, gathered in one file so tuning for balance is a single-
 * file edit. Achievement *ids* and *copy* stay in the catalog
 * (src/games/leksokipos/lib/achievements.ts); only the NUMBERS live here.
 *
 * These are balance knobs, not frozen contracts — unlike the ids, they are meant
 * to be adjusted. Nudging one may shift where a badge earns, so the detection
 * tests encode the current boundary and will flag a change on purpose.
 */

export const LEKSOKIPOS_ACHIEVEMENT_TUNING = {
  /**
   * Word-length one-shots — a found word of EXACTLY each length earns the matching
   * frozen badge (Σιδηρόδρομος = 10, then the 11/12/13 extensions). Ascending; each
   * earned once. The smallest is also the storage floor for player_words: finds
   * below it are not tracked at all (wordsByLength.ts derives WORDS_MIN_TRACKED from
   * this). The badge ids + copy stay frozen in the catalog (achievements.ts).
   */
  wordLengthBadges: [10, 11, 12, 13],

  /** Θεριστής (one-shot) — fraction of a puzzle's valid words that must be found. */
  theristisFoundRatio: 0.8,

  /** Κυνηγός Πανγκράμ (tiered, Epic B) — lifetime distinct pangrams per tier. */
  pangramTierThresholds: { chalkino: 10, asimenio: 20, chryso: 50 },

  /** Συλλέκτης Πόντων (tiered, Epic B) — lifetime points per tier. */
  pointsTierThresholds: { chalkino: 1000, asimenio: 10000, chryso: 25000 },
} as const;
