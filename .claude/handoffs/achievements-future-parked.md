# Handoff (parked): Achievements — future ideas (placement, extra stats, stats page)

**Date:** 2026-07-06 (split out of the old `achievementsEpicB-deferred.md`)
**Status:** ⚪ **Parked — not committed scope.** No grill, no build until promoted. Captured so the patterns aren't lost. Promote an item to its own real handoff when it's actually wanted.

**Built on Epic A + ADR 0013.** The store (`player_achievements` immutable fact rows) and the three detection **lanes** already exist and are designed to absorb everything below without a rewrite.

---

## ✅ Finalization status — Pangram tier B2 (BUILT session 69, 2026-07-07)

The pangram tier (Κυνηγός Πανγκράμ) is **code-complete, green, committed, and live-on-schema.** As of 2026-07-07:

1. **[DONE] Code committed** — landed in commit `818adb0` ("achievements almost done, fix endgame"): `POST /api/pangrams` route, `pangram.ts`/`pangrams.ts` lib, `pangramMerge.ts`, and all three test files. Not uncommitted anymore.
2. **[DONE] Migration pushed.** `supabase/migrations/20260706120000_add_player_pangrams.sql` applied to the shared prod project via `npx supabase db push` (verified: migration `20260706120000` in applied list, `public.player_pangrams` table exists, 0 rows, RLS enabled + open `anon` policy). `POST /api/pangrams` and the `pangram_count` stat are no longer inert.
3. **[HUMAN — verification, PENDING] Prod smoke-check with a throwaway `device_uuid`.** Lanes are gated `!isGodMode`, so god mode can't exercise them — a real check writes **production** rows. Confirm: a pangram find → a `player_pangrams` row; `/api/profile/stats` returns `pangram_count`; at 10 distinct → χάλκινο tier toasts + the TrophyCase chip lights. **Delete that device's `player_pangrams`/`player_achievements` rows afterwards** via Supabase MCP `execute_sql`. (B1's own manual check, session 66, is also still pending — fold it in.)
4. **[NON-BLOCKING] Balance pass** on `pangramTierThresholds` (10/20/50) once real pangram-rate data exists. Badge names are placeholder/not-locked (B2/R1), so a threshold or naming change is a tuning/query edit — **no migration**.

**What shipped (committed in `818adb0`, schema live):** `player_pangrams` table + migration; `POST /api/pangrams` (insert-if-absent → `{count}`, `sanitizePangramWords` shape guards); pure `detectEarnedPangramTiers`/`nextPangramTierThreshold` (+ a generic tier core the points fns now wrap); a 3rd `useAchievementSync` lane (per-word delta-post + mount self-heal riding the one `fetchLifetimeStats` read); `pangram_count` on `/api/profile/stats`; `planPangramMerge` wired into `restore()`; generalized TrophyCase; cleanup-scores regression lock. Decisions recorded in **ADR 0013 "B2 resolutions"** + CONTEXT.md table rows.

---

## Parked ideas

### 1. Placement / relative badges (ADR 0013 **Lane B**)
Awards that depend on a value **not final at end-of-game** — e.g. leaderboard **placement** (1st / 2nd / 3rd). Pattern (already designed, not built): a **deferred server-side job at puzzle-close** reads the final leaderboard and inserts the same `player_achievements` fact rows. **No schema change** — same table, same ids. Since `game_scores` is append-forever (issue 03 fixed), the job no longer races a prune; the leaderboard source stays intact indefinitely. Not in the current catalog — adding the ids is non-breaking (frozen-id rule, ADR 0013).

### 2. Additional cumulative stats / badges
E.g. "reached rank N this many times." Same **Lane C** append-only-set pattern as the shipped pangram tier: a set of qualifying `puzzle_date`s, count = set size, write the fact row on threshold crossing. Any new *id* needs no migration; any new *progress set* needs its own small table — **mirror the shipped pangram tier**: a `player_pangrams`-style set-table + `POST /api/pangrams`-style insert-if-absent route returning `{count}` + a `planPangramMerge`-style Restore union + a `useAchievementSync` lane (see ADR 0013 "B2 resolutions" for the whole shape).

### 3. Richer inline Leaderboard badges
Beyond the existing 🏛️ Τζιμάνι glyph — more inline `Badge` glyphs on leaderboard rows (CONTEXT.md: a Badge is the visual token; the inline-glyph form is the precedent). Pure display over already-earned ids.

### 4. Dedicated stats page
A standalone stats surface (floated during earlier design). The Profile Page already hosts Lifetime Stats + Trophy Case; decide whether a separate page earns its keep before building.

## When promoting one of these
Write a fresh handoff (mirror the prior tier handoffs' structure — B1/B2, both shipped; see ADR 0013 "B1/B2 resolutions" for the pattern), list its open design questions, and run `/grill-with-docs` before `/tdd`. Confirm which detection lane (A client-live / B deferred-server / C append-only-set) it uses — ADR 0013 verified all the above are expressible in the existing lanes.
