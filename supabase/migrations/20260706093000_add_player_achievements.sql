-- player_achievements: immutable earned-fact rows (ADR 0013).
--
-- One row = one Achievement earned by one device. Earning is insert-if-absent
-- (INSERT ... ON CONFLICT DO NOTHING) against the UNIQUE(device_uuid,
-- achievement_id) constraint, so an already-earned Achievement can never be
-- clobbered — "earned forever" holds by construction, no whole-set rewrite.
--
-- Keyed on the canonical device_uuid (never auth_user_id); Sign-in Restore
-- re-points a device's rows onto the canonical identity (ADR 0012 / ADR 0013).
--
-- Detection is client-side at end-of-game; the server runs ZERO detection and
-- only inserts the ids the client posts. Write RLS is therefore OPEN, mirroring
-- game_state's "anon access" (anon players must be able to write their own
-- earned facts). Lifetime / append-forever: never swept by /api/cleanup-scores.
CREATE TABLE public.player_achievements (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_uuid    text        NOT NULL,
  achievement_id text        NOT NULL,
  earned_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_achievements_unique UNIQUE (device_uuid, achievement_id)
);

ALTER TABLE public.player_achievements OWNER TO postgres;

-- Open RLS, identical stance to game_state: anon clients read/write freely.
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon access" ON public.player_achievements
  TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.player_achievements TO anon;
GRANT ALL ON TABLE public.player_achievements TO authenticated;
GRANT ALL ON TABLE public.player_achievements TO service_role;
