# player_profiles is served almost entirely by sequential scans, and its auth_user_id index is never used

**Deferred:** 2026-08-15
**Revisit when:** `player_profiles` passes roughly 5,000 rows, or leaderboard latency becomes
visible. Both are launch-scale events, not today's 47 rows.

## Problem

`pg_stat_user_tables` on 2026-08-15, for `player_profiles` (47 live rows):

| Metric | Value |
| --- | --- |
| `seq_scan` | 9,047 |
| `seq_tup_read` | 363,185 |
| `idx_scan` | 133 |
| `last_autovacuum` | never |

**98.5% of accesses are full table scans.** For comparison, `game_scores` runs 45,009 index scans
against 7,624 sequential ones — the profiles table is the outlier, not the norm.

Per-index usage confirms which lookups are missing their index:

| Index | Scans |
| --- | --- |
| `player_profiles_device_uuid_key` | 97 |
| `player_profiles_pkey` | 36 |
| `player_profiles_auth_user_id_key` | **0** |

The `auth_user_id` unique index has **never been used once**, despite
[`src/app/api/auth/link/route.ts:89`](../../../src/app/api/auth/link/route.ts#L89) selecting on that
column. At 47 rows the planner correctly decides a sequential scan is cheaper than an index
descent, so this is expected small-table behaviour rather than a missing index — but it means the
index has never been *proven*, and the scan-vs-index crossover has never been exercised.

The cost is zero today: 363,185 tuples read across 47 rows is nothing, and 9,047 scans of a
single-page table never leave shared buffers. It stops being nothing when the table grows. Every
leaderboard GET calls `resolveBadges()`
([`src/app/api/game-scores/route.ts:236`](../../../src/app/api/game-scores/route.ts#L236)), which
does an `in()` over up to 21 device UUIDs. If that resolves as a sequential scan at 50,000 profiles,
each leaderboard open reads 50,000 rows — and ISSUE-04's proposed fix routes *display names* through
that same query, making it hotter still.

`last_autovacuum` being `null` with 20 dead tuples against 47 live is also worth a glance: the table
has never crossed the autovacuum threshold, so its statistics are whatever the last manual
`ANALYZE` left. A planner working from stale statistics is exactly how a scan/index crossover gets
missed.

## Why deferred

There is nothing to fix yet — the planner is making the right call for the current table size, and
adding indexes or hints against a 47-row table would be cargo-culting. The work this issue reserves
is a **verification** rather than a change:

1. Seed a scratch copy of `player_profiles` to ~50,000 rows.
2. `EXPLAIN ANALYZE` the `resolveBadges()` `in()` query and the `/api/auth/link` `auth_user_id`
   lookup against it.
3. Confirm both flip to index scans; if not, that is the real bug and it gets its own ticket.

That needs a scratch database, which the single shared dev/prod project (ISSUE-01) does not give us
— running a 50,000-row seed against the live project is exactly the kind of write the CLAUDE.md
guardrails exist to prevent. So this is genuinely blocked on the dev/prod split decision, not just
deprioritised.

## References

- [`src/app/api/game-scores/route.ts`](../../../src/app/api/game-scores/route.ts) — `resolveBadges()`, the hot path.
- [`src/app/api/auth/link/route.ts`](../../../src/app/api/auth/link/route.ts) — the `auth_user_id` lookup.
- ISSUE-01 — the dev/prod split this verification is blocked on.
- ISSUE-04 — its proposed fix increases traffic through the same query.
