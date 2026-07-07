-- player_pangrams: append-only pangram-find fact rows (ADR 0013, B2).
--
-- One row = one pangram word a device found on one puzzle_date. The Κυνηγός
-- Πανγκράμ tier "X / N" the player sees is the SIZE of this set — COUNT(*),
-- never a stored tally. A mutable counter re-introduces the clobber/double-count
-- trap immutable facts avoid (a retry posts twice; a merge double-counts); a set
-- is retry- and merge-safe by construction (ADR 0013 lane C).
--
-- Insert-if-absent (INSERT ... ON CONFLICT DO NOTHING) against
-- UNIQUE(device_uuid, puzzle_date, word): the same pangram re-submitted within a
-- puzzle is a no-op (retry-safe); the same word on a different day counts again
-- (B2/R1 — count = COUNT(*), not COUNT(DISTINCT word)). Keeping the puzzle_date
-- dimension means a later pivot to "distinct words" is a query change, no migration.
--
-- Keyed on the canonical device_uuid (never auth_user_id); Sign-in Restore
-- re-points a device's rows onto the canonical identity and the UNIQUE constraint
-- unions the two devices' finds (ADR 0012 / ADR 0013, planPangramMerge).
--
-- Detection is client-side; the server runs ZERO detection and only inserts the
-- words the client posts. Write RLS is therefore OPEN, mirroring game_state /
-- player_achievements "anon access". Lifetime / append-forever: never swept by
-- /api/cleanup-scores.
CREATE TABLE public.player_pangrams (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_uuid  text        NOT NULL,
  puzzle_date  date        NOT NULL,
  word         text        NOT NULL,
  found_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_pangrams_unique UNIQUE (device_uuid, puzzle_date, word)
);

ALTER TABLE public.player_pangrams OWNER TO postgres;

-- Open RLS, identical stance to game_state / player_achievements: anon clients read/write freely.
ALTER TABLE public.player_pangrams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon access" ON public.player_pangrams
  TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.player_pangrams TO anon;
GRANT ALL ON TABLE public.player_pangrams TO authenticated;
GRANT ALL ON TABLE public.player_pangrams TO service_role;
