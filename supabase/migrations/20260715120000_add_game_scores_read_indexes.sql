-- game_scores read indexes: cover the two hot read paths as the append-forever
-- table grows (game_scores is never pruned — ADR 0012 amendment 2026-07-05).
--
-- The table's only secondary index was UNIQUE(game_id, device_id, puzzle_date)
-- (baseline 20260628101701; the auth_user_id partial index was dropped in
-- 20260704120000). Neither hot read was covered:
--
--   1. Leaderboard top-20 + rank count (/api/game-scores GET):
--      eq(game_id) + eq(puzzle_date) + order/range on score. The unique index's
--      game_id prefix only narrowed to a game's whole history, then scanned.
--      Also serves the Leksokipos first-place-count daily-max aggregate
--      (SELECT puzzle_date, MAX(score) ... GROUP BY puzzle_date).
--
--   2. Per-device reads: lifetime stats (/api/profile/stats) and the Sign-in
--      Restore merge (/api/auth/link) both filter by device_id alone — a full
--      table scan before this.
--
-- Plain CREATE INDEX (not CONCURRENTLY): migrations run in a transaction and the
-- table is small. puzzle_date is text (ISO strings); btree ordering matches date
-- order and serves both asc and desc leaderboard scans.

CREATE INDEX game_scores_game_date_score_idx
  ON public.game_scores (game_id, puzzle_date, score);

CREATE INDEX game_scores_device_id_idx
  ON public.game_scores (device_id);
