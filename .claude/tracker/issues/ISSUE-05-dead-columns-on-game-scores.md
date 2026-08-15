# game_scores carries a dead `is_perfect` column and a `data` jsonb that is empty on 55% of rows

**Deferred:** 2026-08-15
**Revisit when:** the next `game_scores` migration is written for any reason — fold this in rather
than paying for a separate migration. ISSUE-08's read-time name resolution is the likely trigger.

## Problem

Two columns on the append-forever leaderboard table earn nothing.

**`is_perfect boolean NOT NULL DEFAULT false` is dead.** Measured live on 2026-08-15: `0` rows true,
`536` rows false. Grepping `src/` for `is_perfect|isPerfect` returns **three hits, all of them in
[`src/lib/database.types.ts`](../../../src/lib/database.types.ts)** — the generated Supabase types
(Row/Insert/Update). No route reads it, no route writes it, no game computes it. It is the residue
of the perfect-round concept that ADR 0013 retired; the replacement lane is `player_milestones`
with `kind='tzimani'`, which counts days at a found-word ratio instead.

**`data jsonb DEFAULT '{}'` is empty on 294 of 536 rows (55%).** The keys actually in use are:

| Game | Keys written | Purpose |
| --- | --- | --- |
| `leksokipos` | `words`, `pangrams` | counts, "for fairness analysis" |
| `leksiarxeio` | `4`,`5`,`6`,`7`,`8` | per-length points, folded by `mergeLengthScore` |
| the other 5 games | *(none — stays `{}`)* | — |

Only the Leksiarxeio keys are load-bearing: `mergeLengthScore` reads them back to fold each word
length into the day's row ([`src/app/api/game-scores/route.ts:96-115`](../../../src/app/api/game-scores/route.ts#L96-L115)).
The Leksokipos `{ words, pangrams }` counts are write-only — nothing in `src/` reads them back, and
the same facts are now recorded per-word in `player_milestones` (`kind='pangram'`, `kind='word'`),
which is what `/api/profile/stats` actually queries.

The cost is small in bytes (`data` totals ~14 kB across the table) but it is real in a different
currency: two columns that look meaningful to anyone reading the schema, one of which is a trap —
a future contributor could reasonably wire a "perfect round" feature to `is_perfect` and find it
never populated.

## Why deferred

Nothing breaks while they sit there, and dropping a column on the append-forever substrate is the
one table where a mistake is unrecoverable (ISSUE-01: no backups yet). Sequencing matters:

- **`is_perfect`** is a clean `DROP COLUMN` — no reader anywhere. Safe whenever.
- **`data`** must NOT be dropped: Leksiarxeio depends on it. The available cleanup is narrower —
  stop Leksokipos writing `{ words, pangrams }` (drop the `data` argument at the
  [`useScoreSubmission`](../../../src/hooks/useScoreSubmission.ts) call site), or keep writing it and
  document it as deliberate analytics. Decide which; do not silently half-remove it.

Both wait for the same migration as ISSUE-08, and ideally until TICKET-11 has produced a working
encrypted dump so there is something to restore from.

## References

- ADR 0013 — retired the perfect-round concept in favour of the `tzimani` milestone lane.
- [`src/app/api/game-scores/route.ts`](../../../src/app/api/game-scores/route.ts) — the only reader of `data`.
- [`src/lib/scoreMerge.ts`](../../../src/lib/scoreMerge.ts) — `mergeLengthScore`, why Leksiarxeio needs `data`.
- ISSUE-01 — no backups; a reason to not rush DDL on `game_scores`.
- ISSUE-08 — the other `game_scores` cleanup; same migration.
