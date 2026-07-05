/** How many days of ephemeral session data (game_state, transfer_codes) to keep in
 *  the DB. Enforced by the daily Vercel Cron at /api/cleanup-scores.
 *
 *  game_scores is deliberately NOT governed by this — it is the append-forever
 *  lifetime-stats substrate (ADR 0012). Lifetime Stats and streaks derive from its
 *  full history, so pruning it would silently corrupt them (issue 03). */
export const SESSION_RETENTION_DAYS = 10;

/** Days to keep accepted+applied nominations after reviewed_at is set.
 *  Rejected and pending nominations are never deleted. */
export const NOMINATION_APPLIED_RETENTION_DAYS = 30;
