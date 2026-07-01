/** Rolling window the leaderboard displays. Scores within this window must never be deleted. */
export const LEADERBOARD_WINDOW_DAYS = 7;

/** How many days of scores and game-state to keep in the DB. Enforced by the
 *  daily Vercel Cron at /api/cleanup-scores. Must stay above LEADERBOARD_WINDOW_DAYS. */
export const SCORE_RETENTION_DAYS = 10;

/** Days to keep accepted+applied nominations after reviewed_at is set.
 *  Rejected and pending nominations are never deleted. */
export const NOMINATION_APPLIED_RETENTION_DAYS = 30;
