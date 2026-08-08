-- player_words: append-only word-find fact rows (ADR 0013 lane C sibling).
--
-- One row = one valid word a device found on one puzzle_date. The "Λέξεις ανά
-- μήκος" profile card the player sees is an aggregate over this set, never a stored
-- tally. A mutable counter re-introduces the clobber/double-count trap immutable
-- facts avoid (a retry posts twice; a merge double-counts); a set is retry- and
-- merge-safe by construction. Same model as player_pangrams — a sibling table, not
-- a subset of it (a later merge of the two is possible cleanup, not now).
--
-- Insert-if-absent (INSERT ... ON CONFLICT DO NOTHING) against
-- UNIQUE(device_uuid, puzzle_date, word): the same word re-submitted within a
-- puzzle is a no-op (retry-safe); the same word on a different day counts again.
-- Keyed on the canonical device_uuid (never auth_user_id); Sign-in Restore
-- re-points a device's rows onto the canonical identity and the UNIQUE constraint
-- unions the two devices' finds (ADR 0012 / planWordsMerge).
--
-- Columns beyond the pangram shape:
--   length   smallint — stamped server-side from the word, so the per-length read
--            (player_words_by_length) aggregates without ever fetching rows. This
--            table is the fastest-growing on the platform (~20–40 rows/player/day),
--            so a row-fetching count would walk toward the Fluid-CPU envelope.
--   game_id  text DEFAULT 'leksokipos' — cheap future-proofing. Leksokipos is the
--            only game with free-form found words today; a cross-game extension is
--            then a column value (and widening the UNIQUE to include game_id), not
--            a rewrite. Left OUT of the UNIQUE for now to match the route's
--            ON CONFLICT target and the single-game reality.
--
-- Detection is client-side; the server runs ZERO validation and only inserts the
-- words the client posts (shape-bounded by sanitizeFoundWords). Write RLS is
-- therefore OPEN, mirroring player_pangrams. Lifetime / append-forever: never swept
-- by /api/cleanup-scores.
--
-- LAUNCH-RESET NOTE (ADR 0013): this is beta capture data of the same class as the
-- trophy tables. It is gated behind FEATURE_FLAGS.achievements and is subject to
-- the release reset unless a deliberate decision preserves it for calibration.
CREATE TABLE public.player_words (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_uuid  text        NOT NULL,
  puzzle_date  date        NOT NULL,
  word         text        NOT NULL,
  length       smallint    NOT NULL,
  game_id      text        NOT NULL DEFAULT 'leksokipos',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_words_unique UNIQUE (device_uuid, puzzle_date, word)
);

ALTER TABLE public.player_words OWNER TO postgres;

-- Narrowed anon posture (session-92 stance, migration 20260716120100): anon may
-- SELECT and INSERT only — no UPDATE, no DELETE. A find is immutable and never
-- removed; the merge re-points via the service role.
ALTER TABLE public.player_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon select" ON public.player_words
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.player_words
  FOR INSERT TO anon WITH CHECK (true);

GRANT SELECT, INSERT ON TABLE public.player_words TO anon;
GRANT ALL    ON TABLE public.player_words TO authenticated;
GRANT ALL    ON TABLE public.player_words TO service_role;

-- player_words_by_length: per-length find counts for one device, aggregated in the
-- DB so the read never transfers row data (see the /api/profile/words route). The
-- per-device scan is index-backed by the UNIQUE(device_uuid, puzzle_date, word)
-- constraint. Invoker-rights (SECURITY INVOKER, the default): the open anon SELECT
-- policy above already authorizes the read, so no SECURITY DEFINER is warranted.
CREATE FUNCTION public.player_words_by_length(p_device_uuid text)
RETURNS TABLE(length smallint, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT pw.length, count(*)::bigint
  FROM public.player_words pw
  WHERE pw.device_uuid = p_device_uuid
  GROUP BY pw.length
  ORDER BY pw.length
$$;

GRANT EXECUTE ON FUNCTION public.player_words_by_length(text) TO anon, authenticated, service_role;
