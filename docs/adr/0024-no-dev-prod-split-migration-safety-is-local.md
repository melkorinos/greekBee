# ADR 0024 — No dev/prod split; migration safety is a local rehearsal

**Status:** accepted (2026-08-16)
**Decided by:** the operator, 2026-08-16, during the `/grill-with-docs` session on `ISSUE-01`
**Supersedes:** the open "dev/main split" question that `ISSUE-01` carried from 2026-07-05
**Unblocks:** `ISSUE-01` §2 (the `player_profiles` scan verification, which claimed to be blocked on
this decision and was not), and `TICKET-13` (the rehearsal loop this decision replaces the split with)

## Context

One Free-plan Supabase project (`rnfsuvhgufhbekodkmlp`) backs both dev and prod. There is no
automatic backup, no PITR, and no scratch copy. A bad `db push` reaches real player data instantly,
and the only undo that will ever exist is a manual dump.

`ISSUE-01` had carried the obvious remedy since 2026-07-05: a **second free Supabase project** as a
dev or staging database, since a free organization allows two. It was never acted on, and two other
pieces of work were recorded as blocked behind it — the backup automation, and the `player_profiles`
sequential-scan verification.

The operator's stated concern, when finally grilled, was narrower than the issue text assumed:
**migration safety**. Data pollution was explicitly not a concern — the only person testing on
preview is the operator. Vercel previews do share the production database, which the operator
independently named as a risk, but as a *destructive-route* risk rather than a *dirty-rows* one.

A paid plan was ruled out. Supabase Pro at $25/month would have dissolved this question entirely —
daily backups, PITR and native branching — and the operator declined it.

## Decision

**Stay on one hosted Supabase project. Buy migration safety with a local rehearsal instead.**

Before any migration reaches `db push`, restore the most recent production dump into a local
PostgreSQL database, apply the pending migration against those real rows, and see what breaks.
`TICKET-13` builds the loop.

### Why the second project loses

Three reasons, in the order they carried weight:

1. **The second free slot is the disaster-restore target.** `docs/disaster-recovery.md` step 3 says
   to restore into a fresh project. A free organization allows exactly two, so spending the second
   on staging leaves the recovery plan with nowhere to land on the day it is needed. An empty slot
   held in reserve costs nothing and is the only thing that makes that step executable.

2. **An empty staging database passes precisely the migrations that hurt.** The dangerous migration
   is not the exotic one; it is `ALTER TABLE ... SET NOT NULL` meeting a column that has nulls in
   production, or a unique index meeting rows that are duplicated in production. Both succeed
   against empty tables. Staging only catches them if it is seeded from a production dump — which
   is the third reason.

3. **A seeded staging project is a second permanent copy of every player's email.** `pg_dump`
   without a schema filter carries `auth.users`, and stripping it is not an option (see ADR 0012 and
   `docs/disaster-recovery.md`: a public-schema-only restore leaves every `auth_user_id` pointing at
   an account that no longer exists). Restoring the same dump locally keeps that data on one machine
   the operator controls, instead of adding a second cloud copy that must then be secured, rotated
   and remembered.

The local rehearsal beats staging on every axis that mattered: same data realism, no second slot, no
second copy of player identities, and no double-maintained migrations, secrets or OAuth config.

## Docker is not required — measured, not assumed

The rehearsal was first designed around `supabase start`, which reproduces the exact stack
(`supabase/config.toml` pins `major_version = 17`). The operator did not want Docker introduced. Two
measurements made it unnecessary:

- **Docker is installed but not running** on the machine (`docker info` fails on the named pipe), so
  "Docker is available" was never true in the sense that mattered.
- **Across all 19 migrations, the only objects outside the `public` schema that any migration
  touches are `auth.uid()` (4 references) and `auth.users` (3).** Nothing references `storage`,
  `vault`, `graphql`, or any Supabase-only extension.

So the compatibility surface is roughly fifteen lines of SQL — a shim creating schema `auth`, a stub
`auth.users`, an `auth.uid()` reading `current_setting('request.jwt.claims')` exactly as PostgREST
sets it, and the three roles — restored into the local PostgreSQL 18 install that is already on the
machine for `pg_dump`.

**The version gap does not matter for what the rehearsal is for.** A `NOT NULL` failing on existing
nulls and a unique index failing on existing duplicates are data-shape failures; data shape does not
care about the Postgres major version. If a future rehearsal question is genuinely planner-dependent
(as `ISSUE-01` §2's scan-crossover verification is), read the result as indicative rather than
exact — and note that a planner question is answered by *any* Postgres, which is why §2 was never
blocked on this decision in the first place.

## What this decision does not buy

- **`rlsInvariantsLiveDb` and `cleanupScoresLiveDb` cannot run against the local shim.** They go
  through Supabase's HTTP API (PostgREST and GoTrue), which a bare PostgreSQL install does not have.
  A pass therefore means *the migration applies cleanly*, not *the suite is green*. RLS behaviour
  **is** testable in raw SQL against the shim (`SET ROLE anon` plus `SET request.jwt.claims`), but
  those checks would be new work; the operator ruled them out unless RLS actually bites.
- **Nothing about the preview-shares-production-database risk.** That is a separate problem with a
  separate fix — scoping `CRON_SECRET` and `ADMIN_SECRET` so preview builds hold different values
  than production. A second database was never the right instrument for it. Not yet ticketed.
- **Nothing about disaster recovery itself.** The dump is still manual, its upload is still manual,
  and the archive password is still unset. `ISSUE-01` §1 owns that.

## Consequences

- `ISSUE-01` §1 loses the split as an open question and keeps only what is genuinely owed.
- `ISSUE-01` §2's "blocked on section 1's split" claim was false and is rewritten, not annotated.
- `TICKET-13` is the promotion that `ISSUE-01` §1's *"promote to a ticket once this is decided"*
  line called for. It is blocked on `TICKET-11`'s operator half, because a rehearsal needs a dump
  and `npm run db:backup` currently throws — `BACKUP_ARCHIVE_PASSWORD` is documented in
  `.env.local.example` but absent from `.env.local`.
- **The release-day migration queue is now the highest-stakes moment this decision covers.**
  `ISSUE-05` freezes `supabase/migrations/` until release day, so every pending migration lands in
  one afternoon — the same afternoon `launch-reset.sql` empties four tables and the dump is the only
  undo. That queue is what the rehearsal exists for.

## If this is ever revisited

The trigger is money, not scale. Supabase Pro dissolves this whole ADR: daily backups, PITR and
branching replace both the reserved slot and the local rehearsal. Revisit if the plan changes.
Do **not** revisit by proposing a second free project — that is the option this ADR rejected, and
the three reasons above are not reconstructible from the code.

## See also

- `.claude/tracker/issues/ISSUE-01-no-disaster-recovery-backups.md` — §1 (backups) and §2 (scans).
- `.claude/tracker/tickets/TICKET-13-migration-rehearsal-loop.md` — the loop this decision buys.
- [`docs/disaster-recovery.md`](../disaster-recovery.md) — the restore procedure and the "what must
  survive" table; the reserved second project slot is what makes its step 3 executable.
- [ADR 0012](0012-signin-restore-adopts-device-identity.md) — why the dump must keep `auth.users`.
