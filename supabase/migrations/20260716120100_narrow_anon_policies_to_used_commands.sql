-- Narrow the three remaining anon ALL-true policies to the commands the app
-- actually uses (verified by a client-usage sweep, 2026-07-16):
--
--   player_achievements  /api/achievements   GET select + POST insert (ON CONFLICT DO NOTHING)
--   player_pangrams      /api/pangrams       count select + insert (ON CONFLICT DO NOTHING)
--   game_state           /api/game-state     GET select + POST upsert (insert + update)
--
-- Deletes on all three happen only server-side with the service-role client
-- (Sign-in Restore merges in /api/auth/link; the retention cron in
-- /api/cleanup-scores), which bypasses RLS — so dropping anon UPDATE/DELETE
-- changes nothing for the app while closing table-wide mutation with the
-- public key. This is the DB finally enforcing ADR 0013's "immutable earned
-- fact rows" against anon.
--
-- The row expressions stay `true` on purpose: there is no auth context to
-- scope by (device identity, ADR 0012). The point is removing *commands*,
-- not scoping rows. Open INSERT remains a recorded, accepted risk
-- (reflections.md "API rate limiting").

-- player_achievements: SELECT + INSERT only
DROP POLICY "anon access" ON public.player_achievements;
CREATE POLICY "anon select" ON public.player_achievements
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.player_achievements
  FOR INSERT TO anon WITH CHECK (true);

-- player_pangrams: SELECT + INSERT only
DROP POLICY "anon access" ON public.player_pangrams;
CREATE POLICY "anon select" ON public.player_pangrams
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.player_pangrams
  FOR INSERT TO anon WITH CHECK (true);

-- game_state: SELECT + INSERT + UPDATE (upsert), no DELETE
DROP POLICY "anon access" ON public.game_state;
CREATE POLICY "anon select" ON public.game_state
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.game_state
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update" ON public.game_state
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
