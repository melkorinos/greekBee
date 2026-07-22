# Pangram tier (B2) — human prod smoke-check still pending

Status: ready-for-human

Carried out of the deleted `achievements-future-parked.md` (2026-07-18); re-filed after the original ticket was deleted un-done during the pickup sessions.

## What's already proven

The pangram lane verifiably **wrote in prod** — `player_pangrams` held 187 rows across devices by 2026-07-15 (before `FEATURE_FLAGS.achievements` went dark). What has never been human-observed is the tier **crossing**: toast + TrophyCase chip.

## What remains (human)

**Blocked until `FEATURE_FLAGS.achievements` flips to `true`** — the detection/recording pipeline is fully dark while it's off (no toasts, no writes), so this belongs on the launch checklist, not before.

With a throwaway `device_uuid` (lanes are gated `!isGodMode`, so god mode can't exercise them):

- [ ] At **10 distinct pangrams** the χάλκινο tier toasts and the TrophyCase chip lights.
- [ ] Afterwards **delete that device's `player_pangrams` / `player_achievements` / `player_words` rows** via Supabase MCP `execute_sql` (prod write — prompts).

The B1 points-tier manual check (session 66) was also never done — fold it into the same session. Remember ADR 0013's beta-data reset at official release also covers whatever the flag-off era left in these tables.

## References

- ADR 0013 "B2 resolutions" — the lane shape.
- issue `12-badge-ideas-parked.md` §5 — the related pangram threshold balance pass.
