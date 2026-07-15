# HANDOFF — DB schema review follow-ups (2026-07-15)

**For:** a fresh agent implementing the outcomes of the 2026-07-15 database schema review session.
**Scope:** (1) a `game_scores` index migration — ready to implement; (2) "times finished first" placement tracking — needs design before build; (3) optional: per-game "highest score ever" stat.

---

## 0. Mandatory context first

Follow the standard session protocol in `CLAUDE.md` (read `.claude/aiHelper/soul.md`, `memory.md`, `goals.md`, `reflections.md`, `log.md`). Non-negotiable guardrails that bite in this task:

- **One Supabase project backs BOTH dev and prod** — every DB write is production.
- **Schema changes ONLY via a new file in `supabase/migrations/` + `npx supabase db push`** (repo is not `supabase link`ed; use `--db-url` with the connection string from the operator/env — do not print it). Never via dashboard or MCP `apply_migration` alone — the repo drifts.
- **Never prune `game_scores`** — it is the append-forever lifetime-stats substrate (ADR 0012 amendment 2026-07-05).
- Post-feature protocol (soul.md): `npm run test -- --run`, `npx eslint .`, `npm run build` — all green.
- Load `/project-mcp` before any Supabase/Vercel MCP call (project ref `rnfsuvhgufhbekodkmlp`).

## 1. What the review established (do not re-litigate)

Full reasoning lives in `docs/adr/0012-signin-restore-adopts-device-identity.md` and `docs/adr/0013-achievements-immutable-earned-fact-rows.md`. Session conclusions, confirmed with the user:

- **The "cron deletes game_scores" concern is moot.** Fixed session 65 (issue 03, deleted). Verified live 2026-07-15: oldest `game_scores.puzzle_date` = 2026-06-27 (past the 10-day window ⇒ not pruned); oldest `game_state.puzzle_date` = 2026-07-05 (exactly at cutoff ⇒ cron runs). `/api/cleanup-scores` route name is legacy; it sweeps only `game_state`, `transfer_codes`, applied `nominations`.
- **Unbounded `game_scores` growth is accepted.** One row per (game, device, day) via `UNIQUE(game_id, device_id, puzzle_date)` — live posting rewrites, never appends. Measured 2026-07-15: 204 rows / 35 devices / 136 kB total relation size. Escape hatch if ever needed (years away): recompute-into-rollup + prune raw — an operational change, not a redesign. **Do not build the rollup now.** (If ever built: streaks need per-date granularity — precompute streak state before pruning.)
- **Fact tables stay separate from `player_profiles`** (ADR 0013 locked): profile UPDATE RLS is owner-scoped so anon end-of-game writes to signed-in players' rows would fail; immutable rows + `ON CONFLICT DO NOTHING` are retry/merge-safe by construction; blobs/counters clobber or double-count.
- **No incremented `total_score` counter, ever.** `useLiveScorePost` posts on every score change, `postScore` is fire-and-forget (retries), Sign-in Restore merges histories — all three break `total = total + x`. Totals are derived from `game_scores` (`src/lib/lifetimeStats.ts`, served by `GET /api/profile/stats`). If read cost ever matters: periodically *recomputed* rollup, never increment-in-place.

## 2. Task A — `game_scores` index migration (ready to implement)

**Problem:** the table's only secondary index is `UNIQUE(game_id, device_id, puzzle_date)` (see baseline migration `20260628101701`; the `auth_user_id` partial index was dropped in `20260704120000`). Neither hot read is covered as the append-forever table grows:

| Query | Where | Filter shape | Index coverage today |
|---|---|---|---|
| Leaderboard top-20 | `src/app/api/game-scores/route.ts` GET | `eq(game_id) + eq(puzzle_date) + order(score) + limit 20` | `game_id` prefix only — scans a game's whole history |
| Rank count (player outside top-20) | same file | `eq(game_id) + eq(puzzle_date) + gt/lt(score)` | same |
| Lifetime stats | `src/app/api/profile/stats/route.ts` | `eq(device_id)` | none — full table scan |
| Sign-in Restore merge | `src/app/api/auth/link/route.ts` | by `device_id` | none |

**Fix — one new migration** (timestamp-named, e.g. `2026MMDDHHMMSS_add_game_scores_read_indexes.sql`):

```sql
-- Leaderboard reads: eq(game_id) + eq(puzzle_date) + order/range on score.
CREATE INDEX game_scores_game_date_score_idx
  ON public.game_scores (game_id, puzzle_date, score);

-- Per-device reads: lifetime stats aggregate + Sign-in Restore merge.
CREATE INDEX game_scores_device_id_idx
  ON public.game_scores (device_id);
```

Notes for the implementer:
- Plain `CREATE INDEX` (not `CONCURRENTLY` — migrations run in a transaction, and the table is ~200 rows).
- `puzzle_date` is `text` in `game_scores` (ISO strings) — btree on text is fine, ordering matches date order.
- No sort-direction concern: btree serves both `asc` (vrestifrasi) and `desc` scans.
- Deliberately **skipped**: an index on `game_state.puzzle_date` for the cron delete — that table is capped at 10 days of rows, the scan is bounded; reviewed and rejected as noise.
- Apply with `npx supabase db push --db-url <connection string>`; verify with MCP `list_tables`/`execute_sql` (read-only) that both indexes exist. No app-code change, so the three gates should pass untouched — run them anyway per protocol, then update `log.md`.

## 3. Task B — "times finished first" placement tracking (design first, then build)

The user wants lifetime stats/achievements like "total times finished first". Not tracked today. **ADR 0013 already designed the lane** (Consequences, lane B): relative/time-dependent signals get a **once-per-day server job at puzzle-close** that writes ordinary `player_achievements` fact rows. Nothing is lost by waiting: `game_scores` is append-forever, so placement is fully derivable retroactively (the ADR's old "award before the source row is pruned" deadline is moot since session 65).

Open design decisions to settle (grill/spec before coding):
- **Tie handling** — two devices sharing the day's max score: both "first"? (Recommend: yes, ties share rank 1 — matches the leaderboard's count-of-better-scores rank formula already in `game-scores/route.ts` GET.)
- **Sort direction per game** — vrestifrasi is lower-is-better (`sort=asc` in the leaderboard); the job must respect per-game direction. There is no per-game config for this today — the client passes `sort=asc` ad hoc. Consider making direction a `GAME_LEADERBOARD_CONFIG`/`gameRules` fact the job reads (never hardcode per CLAUDE.md).
- **Fact shape** — pure achievement rows (`first-place-<n>` tier ids) vs. a queryable count. The displayed *count* ("finished first 12 times") is not an achievement id; options: (a) derive count on demand from `game_scores` with a window query (fine at current scale, now index-backed after Task A), (b) an append-only fact table `player_placements(device_uuid, game_id, puzzle_date, rank)` mirroring `player_pangrams` (ADR 0013 data-class 3: count = COUNT(*), never a counter). Lean (b) if the count must be cheap/hot; (a) if it's profile-page-only.
- **Job trigger** — a second Vercel cron (pattern: `vercel.json` + `CRON_SECRET` auth, see `/api/cleanup-scores`) that awards for *yesterday's* puzzles (scores final after day close). Idempotent by construction (insert-if-absent), so re-runs and backfills are safe.
- **Retroactive backfill** — since history is complete, the first run can award all past days. Decide whether that's wanted (probably yes — beta resets at launch anyway per ADR 0013).

## 4. Task C (optional) — per-game "highest score ever" stat

User floated it ("maybe even highest score ever reached"). Derivable in the existing reduce: extend `aggregateLifetimeStats` (`src/lib/lifetimeStats.ts`) with a per-game max — **must be per-game** (scores aren't comparable across games; vrestifrasi lower-is-better makes a cross-game max meaningless). Tests in `src/test/shared/lifetimeStats.test.ts`. Zero schema change. Only do this if the profile UI is ready to show it; otherwise leave.

## 5. Suggested skills

| Skill | When |
|---|---|
| `/aihelper` | Session start — full context reload |
| `/project-mcp` | Before ANY Supabase/Vercel MCP call (IDs + param traps) |
| `/grill-with-docs` or `/to-spec` | Task B design decisions (§3) before writing code |
| `/to-tickets` | File Task B as vertical-slice issues once specced |
| `/tdd` | Task C (`lifetimeStats` change) and any Task B app code |
| `/verify` | After Task A push — confirm leaderboard + profile stats still work against prod |

## 6. Session state (for orientation only)

- Branch `dev`; working tree has uncommitted session-81/82 restructures (shared `GameLeaderboardModal`, `answerPools` seam) — **unrelated to this handoff; do not mix commits.**
- Gates at last session close: tests 1600 pass / 6 skip, eslint 0, build 0.
- Live DB snapshot 2026-07-15: `game_scores` 204 rows / 136 kB, `game_state` 90 rows / 264 kB, `player_profiles` 38, `player_achievements` 70, `player_pangrams` 187.
