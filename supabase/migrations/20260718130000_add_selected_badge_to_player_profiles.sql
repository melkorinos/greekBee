-- selected_badge_id: the player-chosen display badge (Handoff B).
--
-- One nullable column on player_profiles. Stores the BASE achievement id (e.g.
-- 'leksokipos-kynigos-pangram'), NEVER a per-tier id — the displayed tier is
-- resolved at read time from the device's earned player_achievements rows, so a
-- tier upgrade needs no write-back here (ADR 0013 self-healing). NULL = no badge
-- (the default; picking is opt-in, and tapping the selected tile again clears it).
--
-- Written only via /api/profile/badge (service role), which validates that the id
-- is a real catalog badge AND that the device holds an earned row for it — RLS on
-- player_profiles keeps its existing posture (anon INSERT/SELECT, auth-scoped
-- UPDATE), unchanged by this migration.
ALTER TABLE public.player_profiles
  ADD COLUMN IF NOT EXISTS selected_badge_id text;
