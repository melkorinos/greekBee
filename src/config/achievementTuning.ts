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
   * Fraction of a puzzle's valid words that must be found to qualify the day for a
   * `kind='tzimani'` milestone row — the day count the tiered Τζιμάνι badge ladders
   * on. One reader now: the Θεριστής one-shot that used to share this number was
   * retired with the catalog rebuild.
   *
   * Lowered 0.8 → 0.7 in TICKET-01, ahead of the rebuild, because milestone rows are
   * only written as days are played — a day that passes under the old bar can never
   * be recorded retroactively, so waiting to lower it would permanently lose every
   * qualifying day in between. Lowering is the safe direction (earned rows are
   * immutable, so a threshold can be lowered but never effectively raised).
   *
   * At 0.8 only 2 of 34 beta devices ever qualified once. 0.7 is still a guess: the
   * found-word ratio was not stored anywhere, which is why the milestone row now
   * carries the achieved percentage in `value`.
   */
  tzimaniFoundRatio: 0.7,

  /**
   * Στην Κορυφή (tiered) — lifetime DAYS the player reached the top rank.
   *
   * Un-tuned on purpose: repeat top-rank frequency was never captured before
   * `kind='top_rank'` existed, so 10 and 25 are judgement, not data. Bronze at 1
   * preserves the meaning of the one-shot this replaces. Err high — too high is
   * correctable by lowering (which grants retroactively), too low is permanent.
   */
  topRankTierThresholds: { chalkino: 1, asimenio: 10, chryso: 25 },

  /**
   * Τζιμάνι (tiered) — lifetime DAYS at `tzimaniFoundRatio` of a puzzle's words.
   *
   * The ladder counts days; it does NOT climb the ratio. A 90/100% rung would be
   * the retired perfect-round concept back under a new name (ADR 0013). Errs high
   * against an unmeasured 0.7: if 70% proves as rare as 80% was, lowering this is
   * free.
   */
  tzimaniTierThresholds: { chalkino: 1, asimenio: 5, chryso: 10 },

  /**
   * Κυνηγός Πανγκράμ (tiered) — lifetime distinct pangrams per tier.
   *
   * Raised 10/20/50 → 25/60/150 in the catalog rebuild. At the beta's ~3 pangrams
   * per played day the old gold landed at ~11 days and one device already held it.
   * The pre-launch wipe was the only window in which raising these was possible.
   */
  pangramTierThresholds: { chalkino: 25, asimenio: 60, chryso: 150 },

  /** Συλλέκτης Πόντων (tiered, Epic B) — lifetime points per tier. */
  pointsTierThresholds: { chalkino: 1000, asimenio: 10000, chryso: 25000 },
} as const;
