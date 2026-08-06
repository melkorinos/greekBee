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

  /**
   * Fraction of a puzzle's valid words that must be found to qualify the day.
   *
   * Two readers, deliberately sharing one number: the Θεριστής one-shot, and the
   * `kind='tzimani'` milestone that TICKET-02's tiered Τζιμάνι badge counts days of.
   * Lowered 0.8 → 0.7 ahead of that rebuild, because milestone rows are only written
   * as days are played — a day that passes under the old bar can never be recorded
   * retroactively, so waiting to lower it would permanently lose every qualifying
   * day in between. Lowering is the safe direction (earned rows are immutable, so a
   * threshold can be lowered but never effectively raised).
   *
   * At 0.8 only 2 of 34 beta devices ever qualified once. 0.7 is still a guess: the
   * found-word ratio was not stored anywhere, which is why the milestone row now
   * carries the achieved percentage in `value`.
   */
  theristisFoundRatio: 0.7,

  /** Κυνηγός Πανγκράμ (tiered, Epic B) — lifetime distinct pangrams per tier. */
  pangramTierThresholds: { chalkino: 10, asimenio: 20, chryso: 50 },

  /** Συλλέκτης Πόντων (tiered, Epic B) — lifetime points per tier. */
  pointsTierThresholds: { chalkino: 1000, asimenio: 10000, chryso: 25000 },
} as const;
