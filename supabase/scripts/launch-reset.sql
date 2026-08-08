-- launch-reset.sql — the one-time pre-launch wipe of gameplay progress.
--
-- ⚠️  THIS IS NOT A MIGRATION AND MUST NEVER BE PUT IN supabase/migrations/.
--     It lives here so it is version-controlled and reviewable, but it is NEVER
--     auto-applied: `npx supabase db push` must not be able to fire it. The
--     operator runs it by hand, in the Supabase dashboard SQL editor, once, on
--     release day. A merged-but-unpushed migration was explicitly rejected as the
--     mechanism, because the next unrelated `db push` would run it early.
--
-- ⚠️  ONE SUPABASE PROJECT BACKS BOTH DEV AND PROD. There is no staging copy to
--     rehearse on. Running this is immediately and irreversibly live.
--
-- WHY THIS EXISTS
--   The rebuilt badge catalog (TICKET-02) retires `leksokipos-first-daily` and
--   `leksokipos-theristis` and revives `leksokipos-tzimani`. Achievement ids
--   FREEZE on first deploy (ADR 0013); those three exceptions are licensed by this
--   wipe and by nothing else. Live rows still hold the retired ids — 34 devices
--   held first-daily and 2 held theristis when measured on 2026-08-06, and both
--   counts only grow. Without this script the catalog and the data disagree.
--
--   It also settles a second problem: Συλλέκτης Πόντων derives from a SUM over
--   game_scores, so leaving scores intact would let it re-earn itself within a day
--   for every device already holding bronze.
--
-- ⚠️  THIS DELIBERATELY BREAKS THE APPEND-FOREVER RULE. CLAUDE.md and ADR 0012
--     both state that game_scores is never pruned. This is a one-time,
--     operator-authorised exception, recorded as an ADR 0012 amendment. It erases
--     leaderboards, streaks and stats for ALL SIX GAMES, not just Leksokipos —
--     that is intended, not a side effect.
--
-- WHAT SURVIVES, AND WHY
--   Identity and community content. Nobody loses their display name, and no word
--   ever submitted to or judged by Leksikastirio is touched — the word list and
--   community puzzles are the expensive, irreplaceable half of the beta, earned by
--   real review work rather than by playing. Only the scoreboard resets.
--
--     KEPT: player_profiles (rows), nominations, nomination_votes,
--           community_leksiarxeio_puzzles, community_leksindeseis_puzzles,
--           community_stavrolekso_puzzles, community_vrestifrasi_puzzles,
--           identity_audit, transfer_codes
--
-- BEFORE RUNNING
--   1. Take a backup (`npm run db:backup`). There is no undo.
--   2. Confirm TICKET-01 + TICKET-02 are deployed. Running this against the OLD
--      catalog would wipe progress and then immediately re-earn the retired ids.
--   3. Run it when nobody is playing — an in-flight round can re-post a score.

begin;

-- Gameplay progress — every game, not only Leksokipos.
delete from public.game_scores;
delete from public.game_state;

-- Earned badges (the output) and the milestone rows they are computed from (the
-- inputs). Both must go: leaving milestones would re-earn every tier on the next
-- profile load, since the tier lanes read lifetime counts off them.
delete from public.player_achievements;
delete from public.player_milestones;

-- A column UPDATE, never a row delete — the profile row IS the player's identity.
-- resolveDisplayBadge already returns null for an id it cannot find, so a retired
-- selection would render no badge rather than crash; this is belt-and-braces, and
-- it is what stops a live selection pointing at a badge nobody can hold any more.
update public.player_profiles
   set selected_badge_id = null
 where selected_badge_id is not null;

commit;

-- VERIFY (run after committing; every count must be 0)
--   select
--     (select count(*) from public.game_scores)         as scores,
--     (select count(*) from public.game_state)          as state,
--     (select count(*) from public.player_achievements) as achievements,
--     (select count(*) from public.player_milestones)   as milestones,
--     (select count(*) from public.player_profiles
--       where selected_badge_id is not null)            as dangling_badges;
--
-- And confirm identity + community content survived (every count > 0 where it was
-- before):
--   select
--     (select count(*) from public.player_profiles) as profiles,
--     (select count(*) from public.nominations)     as nominations;
