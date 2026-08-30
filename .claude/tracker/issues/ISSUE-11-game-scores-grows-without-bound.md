# `game_scores` grows forever and nothing folds the old rows away

**Deferred:** 2026-08-30
**Revisit when:** `pg_total_relation_size('public.game_scores')` crosses **100 MB**, or
sustained daily distinct devices cross **~300**. Either one means the table is adding
roughly 90 MB/year, at which point the fold below is worth building. Re-measure before
acting — do not act on this file's numbers alone.

## Problem

`game_scores` is the append-forever lifetime-stats substrate (ADR 0012) and is
deliberately excluded from the daily cron in `src/app/api/cleanup-scores/route.ts`;
`SESSION_RETENTION_DAYS` governs only `game_state` and `transfer_codes`. Nothing else
prunes or compacts it, so it grows monotonically for the life of the project.

Measured live 2026-08-30:

- 730 rows, 448 kB total (128 kB heap + 280 kB across three indexes) = **628 bytes/row**
- 73 devices lifetime, **~1.3 rows per device per day** (the row is an upsert on
  `UNIQUE(game_id, device_id, puzzle_date)`, so one row per player per game per day —
  not one per word, despite the ~44:1 write-to-row ratio Leksokipos produces)
- Oldest row `2026-06-18`, newest `2026-08-30`

Projected at 1,000 daily players: ~1,300 rows/day → ~475k rows/year → **~300 MB/year**.
The Supabase free tier is 500 MB and the usage dashboard bills roughly double the SQL
figure, so year one at that scale would exceed it. Supabase Pro is 8 GB, which is ~25
years of the same rate, so this is a slow burn and not a launch risk.

Read performance is **not** part of this issue. Both hot paths are indexed
(`game_scores_game_date_score_idx`, `game_scores_device_id_idx`, added 20260715120000)
and 475k rows is trivial for Postgres. TICKET-14 already measured the crossover.

## Why deferred

Today's rate is ~10 rows/day against a 500 MB tier. Building the fold now would be
optimising three orders of magnitude ahead of the load, and the fold is only correct
once we know which columns future features still need per-row.

## The fix, when it triggers — fold, never delete

Deleting rows corrupts lifetime totals, which is exactly what ADR 0012 forbids. The
compaction that preserves them is to **roll rows older than ~1 year into a per-device
aggregate table** and read totals as `aggregate + recent rows`:

- `aggregateLifetimeStats` (`src/lib/lifetimeStats.ts`) consumes only
  `{ game_id, score }` per row and produces `total_points`, `puzzles_played`,
  `leksokipos_points`. A fold key of `(device_id, game_id) → sum(score), count(*)`
  reproduces all three exactly. `/api/profile/stats` selects exactly those two columns.
- The leaderboard (`GET /api/game-scores`) is always `eq(game_id) + eq(puzzle_date)`,
  so it never touches folded rows.
- **The constraint is the merge path.** `src/lib/identityMerge.ts` and
  `src/lib/scoreMerge.ts` re-point rows on Sign-in Restore per
  `(game_id, puzzle_date)`, keeping the better of two rows. Folded rows lose
  `puzzle_date`, so a device that signs in after its history is folded cannot have that
  history merged. The fold must either carry a per-device aggregate that merges by
  addition, or exclude any device that has never been linked. Decide this before writing
  the migration, not during.

## Correction to make when this is picked up

`src/config/retention.ts` says pruning would corrupt "Lifetime Stats and streaks".
**There is no streak feature** — `grep -ri streak src/` finds only that comment and
unrelated matches. Rewrite the comment to name Lifetime Stats alone rather than leaving
a reader hunting for streak code that has never existed.
