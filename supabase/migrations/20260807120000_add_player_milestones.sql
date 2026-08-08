-- player_milestones: one append-only fact table for every countable badge input.
--
-- Absorbs player_pangrams and player_words and adds the two day counters the
-- rebuilt catalog needs (ADR 0013 / .claude/handoffs/badgeIdeas.md). One row = one
-- milestone a device reached on one puzzle_date:
--
--   kind='pangram'   detail=<word>  value=NULL   one pangram found
--   kind='word'      detail=<word>  value=<len>  one ≥10-letter word found
--   kind='top_rank'  detail=''      value=NULL   reached the top rank that day
--   kind='tzimani'   detail=''      value=<pct>  found ≥70% of that day's words
--
-- Insert-if-absent (INSERT ... ON CONFLICT DO NOTHING) against the UNIQUE below:
-- a re-submitted milestone is a no-op (retry-safe), and the same word on a
-- different day counts again. Immutable earned facts, never a mutable counter — a
-- retry would double-count a tally, and Sign-in Restore's merge would double-count
-- it again; a set is safe under both by construction (planMilestoneMerge).
--
-- Keyed on the canonical device_uuid (never auth_user_id); Sign-in Restore
-- re-points a device's rows onto the canonical identity and the UNIQUE constraint
-- unions the two devices' milestones (ADR 0012).
--
-- Three load-bearing shape decisions:
--
--   detail NOT NULL DEFAULT '' — NOT nullable. Postgres treats NULLs as DISTINCT
--     in a unique index, so a nullable detail on the two counter kinds would let
--     the same milestone insert twice and silently break insert-if-absent, which is
--     the guarantee this whole table rests on.
--
--   value smallint NULL — the word length for kind='word' (stamped server-side, so
--     the per-length read aggregates on a column and never fetches rows), and the
--     found-ratio percentage for kind='tzimani' (the one signal the 70% ladder can
--     be re-tuned from). NULL elsewhere: absent is not zero. It also carries a
--     future badge — "N words of 13+ letters" is WHERE kind='word' AND value >= 13,
--     no row fetch.
--
--   NO game_id column, deliberately. See the warning below.
--
-- ⚠️ KNOWN FUTURE MIGRATION — do not "helpfully" add game_id back as a bare column.
--    A second game earning badges needs
--        ALTER TABLE player_milestones ADD COLUMN game_id text NOT NULL DEFAULT 'leksokipos'
--    AND the UNIQUE widened to (device_uuid, game_id, puzzle_date, kind, detail),
--    in the SAME migration. The column present but outside the key is the one shape
--    that loses data silently: game B's row for the same word and date collides
--    with game A's and ON CONFLICT DO NOTHING swallows it — no error, just an
--    undercount. Existing rows default correctly, so no backfill is needed.
--
-- No CHECK constraint on `kind`, declined by the operator with reasons in the spec:
-- anon INSERT is open either way, the impact of a junk kind is cosmetic, cleanup is
-- a manual DELETE, and a constraint would make every future kind a migration.
--
-- Detection is client-side; the server runs ZERO validation and only inserts what
-- the client posts (shape-bounded by sanitizeMilestones). Lifetime / append-forever:
-- never swept by /api/cleanup-scores.
--
-- LAUNCH-RESET NOTE (ADR 0013): this is beta capture data of the same class as the
-- trophy tables and is wiped by supabase/scripts/launch-reset.sql on release day.
CREATE TABLE public.player_milestones (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_uuid  text        NOT NULL,
  puzzle_date  date        NOT NULL,
  kind         text        NOT NULL,
  detail       text        NOT NULL DEFAULT '',
  value        smallint,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_milestones_unique UNIQUE (device_uuid, puzzle_date, kind, detail)
);

ALTER TABLE public.player_milestones OWNER TO postgres;

-- Narrowed anon posture (session-92 stance, migration 20260716120100): anon may
-- SELECT and INSERT only — no UPDATE, no DELETE. A milestone is immutable and never
-- removed; the Sign-in Restore merge re-points via the service role.
ALTER TABLE public.player_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon select" ON public.player_milestones
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.player_milestones
  FOR INSERT TO anon WITH CHECK (true);

GRANT SELECT, INSERT ON TABLE public.player_milestones TO anon;
GRANT ALL    ON TABLE public.player_milestones TO authenticated;
GRANT ALL    ON TABLE public.player_milestones TO service_role;

-- player_milestones_by_length: per-length word-find counts for one device,
-- aggregated in the DB so the read never transfers row data (see the
-- /api/profile/words route). Replaces player_words_by_length, which aggregated the
-- dropped table's `length` column; this reads `value` where kind='word'. The
-- per-device scan is index-backed by the UNIQUE constraint's leading column.
-- Invoker-rights (SECURITY INVOKER, the default): the open anon SELECT policy above
-- already authorizes the read, so no SECURITY DEFINER is warranted.
CREATE FUNCTION public.player_milestones_by_length(p_device_uuid text)
RETURNS TABLE(length smallint, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT pm.value AS length, count(*)::bigint
  FROM public.player_milestones pm
  WHERE pm.device_uuid = p_device_uuid
    AND pm.kind = 'word'
    AND pm.value IS NOT NULL
  GROUP BY pm.value
  ORDER BY pm.value
$$;

GRANT EXECUTE ON FUNCTION public.player_milestones_by_length(text) TO anon, authenticated, service_role;

-- player_milestone_counts: one row per kind this device has reached, aggregated in
-- the DB. This is the single read behind BOTH badge-progress surfaces:
--
--   POST /api/milestones — returns the fresh count for the kinds a lane just wrote,
--     so a tier crossing is known in the same round-trip that recorded it (the
--     no-lag property ADR 0013 B2 engineered for pangrams). The route filters the
--     result down to the posted kinds; one GROUP BY is cheaper than one HEAD count
--     per kind, and cheaper than the per-kind COUNT(*) it replaces.
--   GET /api/profile/stats — replaces a standalone pangram COUNT(*) with this, so
--     two more badges gain live progress values while the hot route's query count
--     stays flat.
--
-- Aggregate-only: no row data crosses the wire, which is what keeps this off the
-- Fluid-CPU envelope (soul.md) as milestone rows accumulate. The per-device scan is
-- index-backed by the UNIQUE constraint's leading column. Invoker-rights: the open
-- anon SELECT policy above already authorizes the read.
CREATE FUNCTION public.player_milestone_counts(p_device_uuid text)
RETURNS TABLE(kind text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT pm.kind, count(*)::bigint
  FROM public.player_milestones pm
  WHERE pm.device_uuid = p_device_uuid
  GROUP BY pm.kind
$$;

GRANT EXECUTE ON FUNCTION public.player_milestone_counts(text) TO anon, authenticated, service_role;

-- Retire the two absorbed tables and the RPC that read one of them.
--
-- No data migration, by operator decision on 2026-08-06: the beta rows (292
-- pangrams, 104 words) are wiped by the launch reset anyway, and the counters they
-- feed are progress bars rather than earned badges — no player_achievements row
-- depends on them, so nothing is un-earned by dropping them. Everyone's pangram
-- progress restarts from zero; the badges already earned are untouched.
--
-- ⚠️ DEPLOY ORDER: one Supabase project backs both dev and prod, so this drop is
--    live the moment it is pushed. Between the push and the Vercel deploy,
--    production runs old code against the new schema and every pangram find 500s.
--    Run `npx supabase db push` and the Vercel deploy BACK TO BACK, after hours.
DROP FUNCTION IF EXISTS public.player_words_by_length(text);
DROP TABLE IF EXISTS public.player_words;
DROP TABLE IF EXISTS public.player_pangrams;
