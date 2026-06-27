/** How many days of scores and game-state to keep in the DB. Enforced by the
 *  daily Vercel Cron at /api/cleanup-scores. Bump here to change the window. */
export const SCORE_RETENTION_DAYS = 10;
