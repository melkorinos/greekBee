# game_scores carries a dead `is_perfect` column that nothing has ever read

**Deferred:** 2026-08-15
**Blocked by:** `TICKET-11` — see "Why deferred" for how much that block is really worth here.
**Revisit when:** TICKET-11 has produced a restorable encrypted dump, or the next `game_scores`
migration is written for any reason — fold this in rather than paying for a separate migration.
No such migration is queued: the read-time display-name fix that was expected to trigger one shipped
on 2026-08-15 without touching the schema, so this now waits on TICKET-11 alone.

*(Split from the original ISSUE-05 on 2026-08-15. The `data` jsonb half needs no schema change and
is therefore not blocked by anything — it moved to [`ISSUE-09`](ISSUE-09-leksokipos-writes-unread-score-metadata.md).)*

## Problem

`is_perfect boolean NOT NULL DEFAULT false` on the append-forever leaderboard table is dead.

Measured live on 2026-08-15: **`0` rows true, `536` rows false.** Grepping `src/` for
`is_perfect|isPerfect` returns **three hits, every one of them in
[`src/lib/database.types.ts`](../../../src/lib/database.types.ts)** — the generated Supabase types
(Row / Insert / Update). No route reads it, no route writes it, no game computes it.

It is residue of the perfect-round concept that ADR 0013 retired. The replacement lane is
`player_milestones` with `kind='tzimani'`, which counts days at a found-word ratio rather than
flagging a single round.

The cost is not bytes — one boolean across 536 rows is nothing. It is that a column which looks
meaningful to anyone reading the schema is in fact a trap: a future contributor could reasonably
wire a "perfect round" feature to `is_perfect` and find it silently never populated, which is
precisely the kind of plausible-but-false signal that has cost this repo whole sessions before.

## Why deferred

Dropping a column on the append-forever substrate is the one place where a mistake is unrecoverable,
and `ISSUE-01` records that there is still no dump to restore from. That is the formal block, and
`TICKET-11` clears it.

**Be honest about what the block is buying, though.** The column holds no information — 0 true, 536
false, no reader — so a `DROP COLUMN` destroys nothing a restore would ever want back. The residual
risk is the *operation*, not the data: a migration against `game_scores` going wrong in some way
beyond the intended column. That is real but small, and whether it justifies waiting for TICKET-11
is an operator judgement rather than something this file should decide. Recorded so the decision is
made knowingly instead of by deferring to a rule whose reason does not quite apply.

**Rides with the drop whenever it happens:** `database.types.ts` is generated, so it must be
regenerated in the same change — otherwise the compiler keeps offering a column that no longer
exists, and ADR 0017's whole point is that the generated types are trusted.

## References

- ADR 0013 — retired the perfect-round concept in favour of the `tzimani` milestone lane.
- ADR 0017 — generated Supabase types are compiler-enforced; regenerate them with the migration.
- ISSUE-01 — no backups; the reason DDL on `game_scores` waits.
- [`TICKET-11`](../tickets/TICKET-11-offsite-encrypted-backup.md) — the encrypted dump that unblocks this.
- [`ISSUE-09`](ISSUE-09-leksokipos-writes-unread-score-metadata.md) — the unblocked half of the original ISSUE-05.
