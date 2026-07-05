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
  /** Σιδηρόδρομος (one-shot) — a single found word this long (letters) earns it. */
  sidirodromosMinLetters: 10,

  /** Θεριστής (one-shot) — fraction of a puzzle's valid words that must be found. */
  theristisFoundRatio: 0.8,

  /** Κυνηγός Πανγκράμ (tiered, Epic B) — lifetime distinct pangrams per tier. */
  pangramTierThresholds: { chalkino: 10, asimenio: 20, chryso: 50 },

  /** Συλλέκτης Πόντων (tiered, Epic B) — lifetime points per tier. */
  pointsTierThresholds: { chalkino: 1000, asimenio: 10000, chryso: 25000 },
} as const;
