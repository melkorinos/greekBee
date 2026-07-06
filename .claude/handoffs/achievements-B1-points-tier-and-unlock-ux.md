# Handoff B1: Achievements — Points tier + Unlock toast + Trophy Case tier-lighting

**Date:** 2026-07-06 (split out of the old `achievementsEpicB-deferred.md`)
**Status:** 🟢 Ready. **Grill the open design questions below before `/tdd`** — they are deliberately left open (design not yet settled).
**Sequencing:** This is **the first of the three achievements-B handoffs**. It builds the shared UX spine (toast + tier-lighting + "X / N" progress) on the *safe* badge — **no DB migration, no sign-in-merge change**. Do this before `achievements-B2-pangram-tier.md` (which reuses this spine).

**Built on Epic A + ADR 0013.** Read `docs/adr/0013-achievements-immutable-earned-fact-rows.md` for the locked storage/detection/merge/retention rules. Epic A (the 5 one-shot badges + `player_achievements` table + `/api/achievements` earn endpoint + `useAchievementSync` + `TrophyCase`) is **live in prod** — reuse it, don't rebuild.

---

## Scope (this handoff only)

1. **The points tier** — `leksokipos-syllektis-ponton-{chalkino,asimenio,chryso}` (thresholds `1000 / 10000 / 25000`, already in `src/config/achievementTuning.ts → pointsTierThresholds`). Awarded when lifetime points first cross each threshold; each tier is its own frozen `player_achievements` row (ADR 0013 — a tier is its own `achievement_id`).
2. **Unlock toast** — a lightweight pop-up the moment a badge (any badge, one-shot or tier) is earned. Reuse the deferred-toast infra from the Sign-in Restore welcome banner (`signin-restore-welcome` consumer pattern). **No confetti, no new npm dep** (soul.md / CLAUDE.md — needs approval).
3. **Trophy Case tier-lighting + progress** — extend `src/components/profile/TrophyCase.tsx` so individual **tier** tiles light up (today it keys only on the top-level `achievement.id`, so tiered tiles never light) and show computed **"X / N"** progress toward the next tier.

## Reuse map (already built — do not rebuild)

- **Earn endpoint** `POST /api/achievements` — `ALL_ACHIEVEMENT_IDS` **already includes the tier ids**, so writing a points-tier fact is just a POST with a tier id. **No endpoint change.**
- **Sign-in merge** — `planAchievementMerge` (`src/lib/achievementMerge.ts`) already unions **all** `player_achievements` rows incl. tier ids on Restore. Points tier needs **no new merge** (it's a `player_achievements` row like any other). *(This is the whole reason the points tier is the safe one to ship first.)*
- **Lifetime points source** — `game_scores` is **append-forever** (issue 03 fixed 2026-07-05), and `GET /api/profile/stats` already returns `total_points` over full history via `aggregateLifetimeStats` (`src/lib/lifetimeStats.ts`).
- **Tuning** — `pointsTierThresholds` already defined. Read it; don't hardcode.
- **Detection hook** — `useAchievementSync` (`src/games/leksokipos/hooks/useAchievementSync.ts`) owns the end-of-game effect + once-per-session dedup + gating (daily-only, not god-mode, known device). Extend or add a lane here.

## ⚠️ Open design questions — GRILL these before `/tdd` (do not pre-decide)

1. **Detection can't be a pure sync branch.** `detectEarnedAchievements()` is pure/synchronous over the end-of-game snapshot; the points tier depends on **lifetime accumulated points the client doesn't hold**. So detection needs an **async read-back** (e.g. read `/api/profile/stats.total_points` at end-of-game, compare to `pointsTierThresholds`, POST any freshly-crossed tier id — idempotent via insert-if-absent). Settle the exact mechanism.
2. **Points-tier scope — cross-game or Leksokipos-only?** `/api/profile/stats.total_points` is **cross-game**; the badge lives under Leksokipos. Pick one and make the data source match (a leksokipos-only total needs a different query).
3. **Timing/race.** The just-finished score may not be reflected in the stats total yet when the read fires. Decide read ordering / whether a one-game lag is acceptable (next game would catch it — arguably fine).
4. **Progress "X / N" data source.** `GET /api/achievements` returns only earned *ids*; showing "740 / 1000" on an un-earned tier needs the **live total number**, not just ids. Decide which endpoint feeds TrophyCase the number (reuse `/api/profile/stats`?).

## Constraints

- Pure logic in `src/games/leksokipos/lib/` — zero React imports; testable.
- Edge runtime for any fetch-only route; no per-word hotpath cost (soul.md). No new npm deps without approval.
- **No new table, no migration, no cleanup-cron change** in this handoff — if you find yourself adding one, it belongs in B2.
- Post-feature protocol (soul.md): review → tests → perf check → consolidation check → all 3 gates → update `log.md`.

## Suggested skills
`/aihelper` (context) → `/grill-with-docs` (settle the 4 open questions, update ADR 0013 / CONTEXT.md inline) → `/prototype` (toast + tier-tile UI) → `/tdd` (build).
