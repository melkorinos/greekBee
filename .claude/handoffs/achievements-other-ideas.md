# Handoff (parked): Achievements — remaining detection/badge ideas

**Date:** 2026-07-07 (promoted out of `achievements-future-parked.md`)
**Status:** ⚪ **Parked — not committed scope.** No grill, no build until promoted. Captured so the patterns aren't lost. Promote an item to its own real handoff when it's actually wanted.

**Built on Epic A + ADR 0013.** The store (`player_achievements` immutable fact rows) and the three detection **lanes** (A client-live / B deferred-server / C append-only-set) already exist and absorb everything below without a rewrite. The shipped **pangram tier B2** (`player_pangrams`, `POST /api/pangrams`, `planPangramMerge`, the 3rd `useAchievementSync` lane) is the **reference implementation** for the Lane C shape — mirror it.

This handoff bundles the three ideas that are NOT the stats page. The stats-page idea was resolved on 2026-07-07 (answered **(b) expand Profile in place**; pangram cell shipped) and its still-live follow-ups moved to `stats-new-capture-ideas.md`.

---

## 1. Placement / relative badges — ADR 0013 **Lane B** (deferred server-side)

Awards that depend on a value **not final at end-of-game** — e.g. leaderboard **placement** (1st / 2nd / 3rd).

**Pattern (designed, not built):** a **deferred server-side job at puzzle-close** reads the final leaderboard and inserts the same `player_achievements` fact rows. **No schema change** — same table, same ids. Since `game_scores` is append-forever (issue 03 fixed), the job no longer races a prune; the leaderboard source stays intact indefinitely. Not in the current catalog — adding the ids is non-breaking (frozen-id rule, ADR 0013).

**Open questions when promoting:**
- **Where does the "puzzle-close" job run?** There are no Supabase Edge Functions (server logic is Next.js API routes on Vercel) — so this is a scheduled/cron route or a Vercel cron, not an edge function. Decide the trigger.
- **What counts as "close"?** Puzzle rollover boundary — define it precisely against how puzzle_date rolls.
- **Ties** — how placement ids resolve when scores tie.
- **Idempotency** — the job must be safe to re-run (insert-if-absent on the fact-row ids), since crons retry.

## 2. Additional cumulative stats / badges — **Lane C** (append-only-set)

E.g. "reached rank N this many times." Same append-only-set pattern as the shipped pangram tier: a set of qualifying `puzzle_date`s, count = set size, write the fact row on threshold crossing.

**Pattern — mirror the shipped pangram tier exactly:**
- a `player_pangrams`-style set-table (`UNIQUE(device_uuid, puzzle_date, …)`, open RLS), + its migration
- a `POST /api/pangrams`-style insert-if-absent route returning `{count}`
- a `planPangramMerge`-style Restore union (re-point device rows onto canonical identity)
- a 4th `useAchievementSync` lane (per-event delta-post + mount self-heal)
- thresholds in `achievementTuning.ts`, ids frozen per ADR 0013

Any new *id* needs no migration; any new *progress set* needs its own small table. See ADR 0013 "B2 resolutions" for the whole shape.

**Open questions when promoting:**
- **What's the qualifying event** and its natural set key? (pangram used `word`; "reached rank N" would key on `puzzle_date` alone.)
- **Distinct-what?** count = `COUNT(*)` over the unique constraint — pick the constraint columns so the count means what the badge claims (B2/R1 kept the `puzzle_date` dimension so a later pivot is a query change, not a migration).
- **Thresholds** — tier cutoffs into `achievementTuning.ts`.

## 3. Richer inline Leaderboard badges — pure display

Beyond the existing 🏛️ Τζιμάνι glyph — more inline `Badge` glyphs on leaderboard rows (CONTEXT.md: a Badge is the visual token; the inline-glyph form is the precedent). **Pure display over already-earned ids** — no detection, no schema, no lane.

**Open questions when promoting:**
- **Which earned ids surface inline** vs. stay in the Trophy Case only (don't clutter the row).
- **Glyph vocabulary** — keep it legible at row scale; reuse the existing `Badge` component.
- **Precedence/ordering** when a player has several inline-eligible badges.

---

## When promoting any of these
Write a fresh handoff (mirror the shipped B1/B2 tier handoffs' structure — see ADR 0013 "B1/B2 resolutions"), list its open design questions as decisions, and run `/grill-with-docs` before `/tdd`. Confirm which detection lane (A client-live / B deferred-server / C append-only-set) it uses — ADR 0013 verified all three above are expressible in the existing lanes.
