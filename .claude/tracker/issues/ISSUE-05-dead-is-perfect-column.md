# game_scores carries a dead `is_perfect` column that nothing has ever read

**Deferred:** 2026-08-15
**Scheduled:** release day — **step 5 of the runbook** in
[`.claude/handoffs/launch-readiness.md`](../../handoffs/launch-readiness.md), between
`launch-reset.sql` and the announce. That step carries the exact migration body, the verify query
and the failure rule; this file carries the reasoning. Do not duplicate one into the other.
**Revisit when:** the runbook step executes, or launch slips far enough that the schedule needs
re-deciding.

*(Split from the original ISSUE-05 on 2026-08-15. The `data` jsonb half needs no schema change and
is therefore not blocked by anything — it became ISSUE-09, which was folded into
[`ISSUE-01`](ISSUE-01-no-disaster-recovery-backups.md) §4 on 2026-08-16.)*

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

## Why it waits for release day, and why `TICKET-11` is no longer the gate

This file used to record the drop as blocked by `TICKET-11`, on the reasoning that DDL against the
append-forever substrate is the one place a mistake is unrecoverable and there is still no dump to
restore from (`ISSUE-01`). **That block was retired on 2026-08-16**: runbook step 4 runs
`launch-reset.sql`, which deletes every row of `game_scores`. The 536 rows a backup would have
protected are already condemned one step earlier, so waiting on a dump to guard them is incoherent.

What survives of the concern is the *operation*, not the data — a migration against `game_scores`
going wrong in some way beyond the intended column. Running it at step 5 answers that too: an
encrypted dump was taken at step 3 minutes before, and the table is empty when the DDL executes, so
there is no row for a bad operation to reach. **The release-day slot is not a compromise between
now and later — it is the only moment where the risk is genuinely zero rather than argued down to
small.** Doing it now on `dev` would be the version that trades a real if small risk for nothing.

Two consequences of that placement, both already written into the runbook step:

- **Nothing enters `supabase/migrations/` in advance.** A committed-but-unpushed migration fires on
  the next unrelated `npx supabase db push` — the identical failure mode that keeps
  `launch-reset.sql` in `supabase/scripts/` instead. The SQL is therefore pre-written in the runbook
  step as text, and only becomes a migration file on the day.
- **`database.types.ts` is generated, so it must be regenerated in the same commit** — otherwise the
  compiler keeps offering a column that no longer exists, and ADR 0017's whole point is that the
  generated types are trusted. That commit needs no deploy of its own: types are compile-time only
  and nothing selects the column, so it rides whatever deploy comes next.

**Owed on the day, and easy to forget:** ADR 0013's line stating the column is *kept* — "data stays,
nothing reads it; an optional drop can ride a future migration" — becomes false the moment the drop
lands. It is a standing condition rather than a dated event, so a cold reader takes it as current.
Amend ADR 0013; do not open a new ADR for this (a reader asking where `is_perfect` went is already
sent to 0013, so it fails the surprising-without-context test).

**Checked and clear:** `rlsInvariantsLiveDb.test.ts` and `cleanupScoresLiveDb.test.ts` both write to
`game_scores` live and neither names the column — the `NOT NULL DEFAULT false` was covering their
inserts, so nothing in the suite breaks. `CONTEXT.md` never names the column either; its Τζιμάνι
entries already record the retired-versus-current fork, so the glossary needs no edit.

## References

- ADR 0013 — retired the perfect-round concept in favour of the `tzimani` milestone lane; **amend it when the drop lands**.
- ADR 0017 — generated Supabase types are compiler-enforced; regenerate them with the migration.
- [`.claude/handoffs/launch-readiness.md`](../../handoffs/launch-readiness.md) — runbook step 5, which owns the *when* and the exact SQL.
- ISSUE-01 — the missing backups this used to be gated on. (The dev/prod split is no longer there: decided against in ADR 0024, 2026-08-16.)
- [`TICKET-11`](../tickets/TICKET-11-offsite-encrypted-backup.md) — the encrypted dump. Still owed before runbook step 3, but no longer a gate on this.
- [`ISSUE-01`](ISSUE-01-no-disaster-recovery-backups.md) §4 — the other half of the original ISSUE-05, decided separately.
