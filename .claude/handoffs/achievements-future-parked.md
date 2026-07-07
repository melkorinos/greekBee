# Handoff: Achievements — Pangram tier B2 finalization status

**Date:** 2026-07-06 (split out of the old `achievementsEpicB-deferred.md`); ideas promoted out 2026-07-07
**Status:** 🟡 **B2 shipped & schema-live — one human smoke-check pending.** See the finalization section below.

**Built on Epic A + ADR 0013.** The store (`player_achievements` immutable fact rows) and the three detection **lanes** already exist and are designed to absorb future work without a rewrite.

**The parked future ideas moved to their own handoffs on 2026-07-07:**
- **`achievements-stats-page.md`** — dedicated stats page (display surface; answer the "does it beat the Profile Page" tension first).
- **`achievements-other-ideas.md`** — placement badges (Lane B), additional cumulative stats (Lane C), richer inline leaderboard badges (display).

All three stay ⚪ parked / not-committed until promoted; each lists its open design questions + `/grill-with-docs` → `/tdd` path.

---

## ✅ Finalization status — Pangram tier B2 (BUILT session 69, 2026-07-07)

The pangram tier (Κυνηγός Πανγκράμ) is **code-complete, green, committed, and live-on-schema.** As of 2026-07-07:

1. **[DONE] Code committed** — landed in commit `818adb0` ("achievements almost done, fix endgame"): `POST /api/pangrams` route, `pangram.ts`/`pangrams.ts` lib, `pangramMerge.ts`, and all three test files. Not uncommitted anymore.
2. **[DONE] Migration pushed.** `supabase/migrations/20260706120000_add_player_pangrams.sql` applied to the shared prod project via `npx supabase db push` (verified: migration `20260706120000` in applied list, `public.player_pangrams` table exists, 0 rows, RLS enabled + open `anon` policy). `POST /api/pangrams` and the `pangram_count` stat are no longer inert.
3. **[HUMAN — verification, PENDING] Prod smoke-check with a throwaway `device_uuid`.** Lanes are gated `!isGodMode`, so god mode can't exercise them — a real check writes **production** rows. Confirm: a pangram find → a `player_pangrams` row; `/api/profile/stats` returns `pangram_count`; at 10 distinct → χάλκινο tier toasts + the TrophyCase chip lights. **Delete that device's `player_pangrams`/`player_achievements` rows afterwards** via Supabase MCP `execute_sql`. (B1's own manual check, session 66, is also still pending — fold it in.)
4. **[NON-BLOCKING] Balance pass** on `pangramTierThresholds` (10/20/50) once real pangram-rate data exists. Badge names are placeholder/not-locked (B2/R1), so a threshold or naming change is a tuning/query edit — **no migration**.

**What shipped (committed in `818adb0`, schema live):** `player_pangrams` table + migration; `POST /api/pangrams` (insert-if-absent → `{count}`, `sanitizePangramWords` shape guards); pure `detectEarnedPangramTiers`/`nextPangramTierThreshold` (+ a generic tier core the points fns now wrap); a 3rd `useAchievementSync` lane (per-word delta-post + mount self-heal riding the one `fetchLifetimeStats` read); `pangram_count` on `/api/profile/stats`; `planPangramMerge` wired into `restore()`; generalized TrophyCase; cleanup-scores regression lock. Decisions recorded in **ADR 0013 "B2 resolutions"** + CONTEXT.md table rows.

---

## Parked future ideas — MOVED

The four parked ideas that used to live here were promoted to their own handoffs on 2026-07-07 (see the header links): the **stats page** → `achievements-stats-page.md`; **placement badges + cumulative stats + inline leaderboard badges** → `achievements-other-ideas.md`. Nothing is committed scope; each new handoff carries its open design questions and the `/grill-with-docs` → `/tdd` path.
