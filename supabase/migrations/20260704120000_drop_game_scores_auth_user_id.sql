-- Drop game_scores.auth_user_id — a denormalized stamp with zero readers.
--
-- Rationale (diagnosis 2026-07-04; ADR 0012 §6 — scores are not a security
-- boundary): the leaderboard, lifetime stats, and Sign-in Restore all key off
-- device_id; the authoritative device→account map lives in player_profiles
-- (unique partial index on auth_user_id). game_scores.auth_user_id was only ever
-- written by the link-time back-fill, so any score posted while already signed
-- in stayed null forever.
--
-- Worse, it was a live foot-gun: the scores_update policy
--   (auth_user_id IS NULL OR auth_user_id = auth.uid())
-- combined with the anon write client (auth.uid() is null server-side) meant a
-- *stamped* row could never be UPDATE-d again — a signed-in player's "beat your
-- score" write would silently freeze. Removing the column removes both the dead
-- data and the trap. Account-scoped queries, if ever needed, are a device_id →
-- player_profiles join at read time.

-- 1. Rewrite scores_update so it no longer references the column. The leaderboard
--    is already fully open (scores_insert / scores_select are unconditional and
--    every row's auth_user_id is null today), so USING (true) does not change the
--    live access matrix — it only removes the latent lock.
DROP POLICY IF EXISTS scores_update ON public.game_scores;
CREATE POLICY scores_update ON public.game_scores FOR UPDATE USING (true);

-- 2. Drop the column. Its FK (game_scores_auth_user_id_fkey) and partial index
--    (game_scores_auth_user_id_idx) depend solely on it and are dropped with it.
ALTER TABLE public.game_scores DROP COLUMN IF EXISTS auth_user_id;
