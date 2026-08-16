# Rehearse every migration against real production rows before it reaches `db push`

**Status:** ready
**Blocked by:** `TICKET-11`'s operator half — this ticket needs a real dump to restore, and
`npm run db:backup` currently throws because `BACKUP_ARCHIVE_PASSWORD` is absent from `.env.local`.
Nothing here can be verified end to end until one `.7z` exists on the machine.
**Spec:** [ADR 0024](../../../docs/adr/0024-no-dev-prod-split-migration-safety-is-local.md) —
the decision that chose a local rehearsal over a second Supabase project ·
[`ISSUE-01` §1](../issues/ISSUE-01-no-disaster-recovery-backups.md) — the *"promote to a ticket once
this is decided"* line this ticket discharges · [`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md)

## Why

One Free-plan Supabase project backs both dev and prod, with no automatic backups and no PITR. A
bad `db push` reaches real player data instantly and the only undo is a manual dump. ADR 0024 ruled
out a second project as the remedy and chose this instead: before a migration is pushed, replay it
against a local copy of the real rows and find out what it does.

The urgency is dated, not abstract. `ISSUE-05` freezes `supabase/migrations/` until release day —
*"Nothing enters `supabase/migrations/` in advance"*, because a committed-but-unpushed migration
fires on the next unrelated `db push`. So every pending migration lands in a single afternoon: the
`is_perfect` DROP at runbook step 5, plus whatever `ISSUE-01` §3's nomination index becomes. That is
the same afternoon `launch-reset.sql` empties four tables and the fresh dump is the only undo that
exists. **The highest-stakes migration moment this project will ever have is currently unrehearsed.**

Build it now, while the migrations folder is frozen and there is nothing pending to disturb.

## What the rehearsal must catch

Data-shape failures — the ones that pass against an empty database and fail against a real one:

- `SET NOT NULL` on a column that has nulls in production
- a `UNIQUE` index on rows that are duplicated in production
- a foreign key added against rows that violate it
- a `CHECK` constraint that existing rows fail

These are the entire justification for using a real dump instead of a schema-only fixture.

## Scope

- [ ] **`scripts/lib/rehearsal/auth-shim.sql`** — the compatibility layer. Across all 19 migrations
      the only objects outside `public` that any migration touches are `auth.uid()` (4 references)
      and `auth.users` (3), so the shim is small and must stay that way:
  - [ ] `CREATE SCHEMA auth`
  - [ ] a stub `auth.users` table — enough columns for the FK references in the migrations to
        resolve (`id uuid primary key` at minimum; check the three references before fixing the shape)
  - [ ] `auth.uid()` returning the `sub` claim out of
        `current_setting('request.jwt.claims', true)::json`, which is exactly how PostgREST supplies
        it — so RLS policies behave the same way locally as they do in production
  - [ ] roles `anon`, `authenticated`, `service_role`
- [ ] **`scripts/rehearse-migration.ps1`** — the loop, PowerShell to match `backup-db.ps1`:
  - [ ] preflight `psql`, and fail loudly if the local PostgreSQL server is not reachable
  - [ ] locate the newest `db-backups/*.7z`, extract it to a temp directory using
        `BACKUP_ARCHIVE_PASSWORD` from `.env.local` (reuse `backup-db.ps1`'s env-reading and
        7-Zip-locating code rather than re-rolling it)
  - [ ] drop and recreate a scratch database (a fixed name, e.g. `greek_rehearsal`) so every run
        starts clean
  - [ ] apply the shim, then restore the dump's `public` schema and data into it
  - [ ] apply the migrations in `supabase/migrations/` that the restored database has not seen, in
        filename order, each in its own transaction, **stopping at the first failure and printing
        the failing statement**
  - [ ] delete the extracted plaintext dump on exit, including on failure — the archive is
        encrypted precisely because its contents should not linger unencrypted on disk
  - [ ] report: which migrations applied, which failed, and the error
- [ ] **`npm run db:rehearse`** wired in `package.json`
- [ ] **`docs/disaster-recovery.md`** — a short *Rehearsing a migration* section pointing at the
      script, and a line in the release-day path saying the queue is rehearsed before it is pushed
- [ ] **`CLAUDE.md`** — the DB schema standing rule gains one clause: rehearse before `db push`

## Explicitly out of scope

- **Docker and `supabase start`.** ADR 0024 measured this and ruled it out; the shim replaces it.
  Do not reintroduce it as a convenience.
- **Running `rlsInvariantsLiveDb` / `cleanupScoresLiveDb` against the scratch database.** They go
  through Supabase's HTTP API, which a bare PostgreSQL install does not have. A pass here means
  *the migration applied*, nothing more. The operator ruled that SQL-level RLS checks are not worth
  writing unless RLS actually bites.
- **Anything touching the real project.** This ticket must never write to
  `rnfsuvhgufhbekodkmlp`; reading a dump that already exists on disk is its only relationship to it.
- **Adding a migration to prove the script works** — the folder is frozen. Prove it with a throwaway
  `.sql` fed to the script from a temp path, or by re-applying an already-applied migration and
  watching it be skipped.

## Done when

1. `npm run db:rehearse` restores the newest archive into a local scratch database, applies the
   pending migrations (today: none), and reports success.
2. A deliberately poisoned test migration — `ALTER TABLE player_profiles ALTER COLUMN display_name
   SET NOT NULL` against a dump that has nulls there — **fails the rehearsal with the offending
   statement printed.** This is the acceptance test; a rehearsal that cannot fail proves nothing.
3. The extracted plaintext dump is gone from disk after both runs, the passing one and the failing
   one.
4. `npm run test -- --run`, `npx eslint .` and `npm run build` are green.

## Notes for whoever picks this up

- `scripts/backup-db.ps1` already solves env-file reading, 7-Zip location and PostgreSQL client-tool
  preflighting. Extract and share rather than copying — two divergent copies of the same preflight
  is exactly the drift `CLAUDE.md`'s one-fact-one-owner rule exists to prevent.
- The local install is **PostgreSQL 18**; the hosted project is **17**. Irrelevant for data-shape
  failures, which is all this ticket claims to catch. Do not present a rehearsal pass as a guarantee
  about planner behaviour.
- The dump is not schema-filtered, so it contains `auth`, `storage` and Supabase-only
  `CREATE EXTENSION` lines that a stock PostgreSQL cannot run. Restore `public` selectively rather
  than replaying the whole file and tolerating errors — **a restore that prints expected errors is a
  restore that hides unexpected ones.**
