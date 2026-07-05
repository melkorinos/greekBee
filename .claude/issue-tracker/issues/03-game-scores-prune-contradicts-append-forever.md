# game_scores pruned at 10d contradicts ADR 0012 "append-forever" → Lifetime Stats are window-capped & point-tiers blocked

Status: ready-for-agent

> **Sequencing (user, 2026-07-05):** do this fix **first**, before Achievements Epic A/B. Approach **decided** — see "Decision & implementation plan" below; no grill needed. Pickup: run a fresh session with `/aihelper` then `/tdd` (or `/diagnose`) on this file.

## The contradiction

- **ADR 0012** decided `game_scores` is **append-forever**: *"lifetime stats and streaks derive from it, so pruning would silently corrupt them."*
- **The code still prunes it.** `/api/cleanup-scores` deletes `game_scores` rows older than `SCORE_RETENTION_DAYS = 10` ([retention.ts](../../../src/config/retention.ts), [cleanup-scores/route.ts](../../../src/app/api/cleanup-scores/route.ts) line 39).
- **`/api/profile/stats`** sums `total_points` / `puzzles_played` / `tzimani_count` over `game_scores` with **no date filter** ([profile/stats/route.ts](../../../src/app/api/profile/stats/route.ts) lines 27-35) — i.e. it *assumes* full history.

**Net effect (live latent bug):** "Lifetime Stats" are actually **last-10-days** stats. A player's total silently stops growing / resets as old rows are pruned. The glossary (CONTEXT.md) defines Lifetime Stats as aggregates over *full* history — not currently true.

## Why it blocks achievements (ADR 0013)

- Epic B's **`syllektis-ponton`** tier (lifetime points ≥ 1.000 / 10.000 / 25.000) **cannot be awarded correctly** — you can't sum lifetime points from a 10-day window.
- **Streak** (current/best, from distinct `puzzle_date`s) is also window-capped.
- Achievement *facts* themselves are safe (`player_achievements` is its own never-swept table — ADR 0013), and **Lane B** placement awards survive *if* the daily job runs before the prune. But anything that **derives** from `game_scores` history is capped. This is a core reason ADR 0013 stores facts instead of deriving.

## Is the bloat concern (the reason for the prune) founded? — measured 2026-07-05

| table | rows | total size | ~bytes/row (incl. indexes) | nature |
|---|---|---|---|---|
| `game_scores` | 123 | 120 kB | ~1.0 kB | **small, valuable** (lifetime substrate) |
| `game_state` | 97 | 264 kB | ~2.8 kB | **larger, ephemeral** (`foundWords` blobs) |

Projected `game_scores` growth if kept append-forever (~1 kB/row, 1 row per player·game·day):

| daily active players | rows/year | size/year |
|---|---|---|
| current (~12 rows/day) | ~4.4 k | **~4 MB** |
| 100 | ~110 k | ~110 MB |
| 1 000 | ~1.1 M | ~1.1 GB |

**Conclusion:** the instinct to bound unbounded growth is sound engineering hygiene, but (a) at realistic scale it's premature by *years* (Supabase Pro includes 8 GB; Postgres handles millions of small indexed rows fine), and (b) **the prune targets the wrong table** — `game_state` is the bigger, genuinely-disposable data; `game_scores` is small and is the lifetime substrate. The prune also **conflates two separate things**: the leaderboard's 7-day *display window* is a **query filter** (`WHERE puzzle_date >= today-7`), not a reason to **delete** rows.

## Decision & implementation plan (agreed 2026-07-05 — option 1)

**Chosen: option 1 — stop pruning `game_scores`; keep pruning the ephemeral tables.** Lowest complexity, matches ADR 0012, unblocks Lifetime Stats + `syllektis-ponton`. Grounded in the measurements above (scores are small + valuable; `game_state` is the real bloat and is disposable). Options 2/3 stay parked for a "~10k DAU" future, recorded below.

Concrete steps (TDD — flip the tests first, they currently assert the buggy behaviour):

- [ ] **`src/config/retention.ts`** — split the knob per-table. `game_scores` is no longer pruned; introduce a session/state retention constant (e.g. rename `SCORE_RETENTION_DAYS` → `SESSION_RETENTION_DAYS`) governing `game_state` + `transfer_codes`. `LEADERBOARD_WINDOW_DAYS` is now used *only* as the old prune-guard — with scores never pruned it's effectively dead; remove it (and its guard) or demote to a doc comment. Fix the stale "scores within this window must never be deleted" comment.
- [ ] **`src/app/api/cleanup-scores/route.ts`** — remove the `game_scores` delete (first element of the `Promise.all`, line ~39). Keep the `game_state`, `transfer_codes`, and `nominations` deletes. Drop/repoint the `SCORE_RETENTION_DAYS <= LEADERBOARD_WINDOW_DAYS` guard. Update the header comment (it says it deletes `game_scores`). Consider renaming the route to reflect it no longer touches scores (optional; `vercel.json` cron path must stay in sync if renamed).
- [ ] **Tests** — `src/test/shared/cleanupScoresRoute.test.ts` + `src/test/shared/cleanupScoresLiveDb.test.ts` currently assert old `game_scores` rows are deleted; flip them to assert `game_scores` **survives** while `game_state` older than the session window is deleted. Add a `lifetimeStats` / `/api/profile/stats` test asserting stats include data **older than `LEADERBOARD_WINDOW_DAYS`** (regression lock for the whole bug).
- [ ] **Docs** — add a short amendment to **ADR 0012** noting append-forever is now actually *implemented* (2026-07-05; previously the cron still pruned — this issue). Reconcile the CONTEXT.md retention/"append-forever" note if it needs it.

**Blast radius (verified):** `SCORE_RETENTION_DAYS` / `LEADERBOARD_WINDOW_DAYS` are referenced only in `retention.ts`, `cleanup-scores/route.ts`, and the two cleanup tests. `vercel.json` schedules the cron. The leaderboard GET queries a single `puzzle_date` (`.eq`), so it never depended on a rolling window — dropping the prune can't affect it.

**Verification gate:** `npm run test -- --run`, `npx eslint .`, `npm run build` all green. Note the shared dev/prod DB — the live-DB cleanup test hits production data; run with care.

## Parked alternatives (only if `game_scores` ever gets big)

2. **Pre-aggregate a durable per-player rollup** (points, puzzle count, Τζιμάνι count, pangram set, streak bounds) updated idempotently on game completion; resume pruning raw `game_scores`. Bounds raw storage while preserving lifetime stats — adds a rollup table + careful idempotent updates (avoid the mutable-counter double-count trap; ADR 0013).
3. **Archive cold rows** to cheaper storage. Overkill at current scale.

## References

- ADR 0012 — `docs/adr/0012-signin-restore-adopts-device-identity.md` (Consequences: "game_scores becomes append-forever").
- ADR 0013 — `docs/adr/0013-achievements-immutable-earned-fact-rows.md` (Dependency-flag consequence; facts-not-derivation rationale).
- Handoffs: `.claude/handoffs/achievementsEpicA-minimum.md` (retention flag), `.claude/handoffs/achievementsEpicB-deferred.md` (`syllektis-ponton` marked blocked).
