# Handoff B2: Achievements — Pangram tier (new set-table + sign-in merge + cleanup exclusion)

**Date:** 2026-07-06 (split out of the old `achievementsEpicB-deferred.md`)
**Status:** 🟡 Ready **after B1**. **Grill the open design questions below before `/tdd`.**
**Sequencing:** Do **`achievements-B1-points-tier-and-unlock-ux.md` first** — it builds the shared UX spine (unlock toast + Trophy Case tier-lighting + "X / N" progress) that this handoff reuses. This handoff is the **DB-touching, merge-touching** half of the tiered badges, deliberately isolated so it can be reviewed on its own blast radius.

**Built on Epic A + ADR 0013.** Read `docs/adr/0013-achievements-immutable-earned-fact-rows.md` — especially **Lane C** (append-only set → size → crossing fact) and the retention/merge rules.

---

## Scope (this handoff only)

**The pangram tier** — `leksokipos-kynigos-pangram-{chalkino,asimenio,chryso}` (thresholds `10 / 20 / 50` distinct pangrams, already in `src/config/achievementTuning.ts → pangramTierThresholds`). Each tier is its own frozen `player_achievements` row, written the moment the distinct-pangram count first crosses its threshold.

**Progress = an append-only SET, never a counter (ADR 0013 Lane C).** The "X / 10" a player sees is the *size* of a set, computed, never a stored tally. A mutable `count = count + 1` re-introduces the exact clobber/double-count trap immutable facts avoid (a retry posts twice; a merge double-counts). Sets are retry- and merge-safe by construction.

## What this handoff must build (the heavy, risky parts)

1. **New table `player_pangrams`** — mirrors `player_achievements`: open RLS (anon insert like `game_state`), insert-if-absent, a `UNIQUE` constraint that makes re-inserting the same pangram a no-op. Count = `COUNT(*)`. **New migration in `supabase/migrations/` + `npx supabase db push`** (CLAUDE.md — never via dashboard/MCP alone). ⚠️ One shared Supabase project backs dev+prod — treat the migration as production.
2. **Its OWN sign-in merge** — `planAchievementMerge` covers `player_achievements` only. A new progress-set table needs its **own merge in `restore()`** (`/api/auth/link`), mirroring `planAchievementMerge` (repoint old-device rows onto the canonical identity, drop duplicates via the UNIQUE constraint). Two devices **union**; double-counting impossible by construction.
3. **Its OWN exclusion from the cleanup cron** — `/api/cleanup-scores` must **never** sweep `player_pangrams` (it's append-forever, same stance as `game_scores` / `player_achievements`). Add a regression test asserting the route never deletes it.
4. **Tier detection + write** — at end-of-game, record any distinct pangrams found; when the set size first crosses a threshold, POST the tier id to `/api/achievements` (`ALL_ACHIEVEMENT_IDS` already whitelists the pangram-tier ids — **no earn-endpoint change**).

## Reuse map (already built — do not rebuild)

- **UX spine from B1** — unlock toast + Trophy Case tier-lighting + "X / N" progress display already exist; this handoff just feeds the pangram tier into them.
- **Earn endpoint** `POST /api/achievements` — pangram-tier ids already whitelisted; writing a tier fact is a plain POST.
- **Merge precedent** — copy the shape of `planAchievementMerge` (`src/lib/achievementMerge.ts`) for the new set-table merge.
- **Tuning** — `pangramTierThresholds` already defined. Read it; don't hardcode.
- **`isPangram`** — pure detector already in `src/games/leksokipos/lib/` (used by scoring).

## ⚠️ Open design questions — GRILL these before `/tdd` (do not pre-decide)

1. **UNIQUE-key semantics — the load-bearing one.** `(device_uuid, puzzle_date, word)` → the *same* pangram word on two different days counts **twice**; `(device_uuid, word)` → each pangram word counts **once ever**. "Distinct pangrams" is ambiguous and this choice redefines what the `10/20/50` thresholds mean. Decide deliberately.
2. **Detection round-trips.** Post-then-read the count, or have the pangram-POST endpoint **return the new count** so the client can check the crossing in one round-trip? Decide the wire shape (this also decides whether pangrams get their own route or piggyback an existing one).
3. **Progress "X / N" data source.** TrophyCase needs the **live set size** for the pangram tile — decide which endpoint returns it.
4. **Offline-Lock / retry tolerance.** Confirm the insert-if-absent + UNIQUE design makes duplicate flushes from Offline Lock a genuine no-op (it should — same rule as scores).

## Constraints

- Pure logic in `src/games/leksokipos/lib/` — zero React imports; testable.
- DB change **only** via `supabase/migrations/` + `npx supabase db push`. New set-table mirrors `player_achievements`: open RLS, insert-if-absent, unioned on Restore, **never swept** by cleanup.
- Edge runtime for fetch-only routes; no per-word hotpath cost (soul.md). No new npm deps without approval.
- Post-feature protocol (soul.md): review → tests → perf check → consolidation check → all 3 gates → update `log.md`.

## Suggested skills
`/aihelper` (context) → `/grill-with-docs` (settle the 4 open questions incl. the UNIQUE-key call; update ADR 0013 / CONTEXT.md table list inline) → `/tdd` (build).
