-- ADR 0028 — Λεξιαρχείο and Βρες τη Φράση get their leaderboards back, which puts
-- Λεξιαρχείο's per-length fold back in the POST /api/game-scores route. That fold
-- reads and writes `game_scores.data`, the column migration
-- `20260820120000_drop_two_community_queues_and_dead_score_columns.sql` dropped on
-- 2026-08-21 once ADR 0027 had made it dead.
--
-- Same shape as the baseline: jsonb, NOT NULL, defaulting to '{}'. The default is
-- what makes this safe against the 686 rows already in the table — every existing
-- row, from all seven Games, is backfilled with an empty object rather than
-- rejected. The 41 Λεξιαρχείο rows lose their old per-length breakdown for good
-- (it went with the DROP), but their `score` totals are intact and the breakdown
-- was never read back by anything: `mergeLengthScore` folds forward from whatever
-- it finds, so an empty object simply means the next post for a given day starts
-- that day's fold over. Only the 15 devices that played before 2026-08-20 are
-- affected, and only if they replay one of those exact dates from the archive.
alter table public.game_scores
  add column if not exists data jsonb not null default '{}'::jsonb;
