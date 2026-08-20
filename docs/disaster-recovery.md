# Disaster Recovery — surviving total DB loss

How to get everyone's scores and achievements back if the **whole database** dies
(project deleted, corrupted, wiped by a bad migration). This is *not* the same as
[`admin-restore.md`](admin-restore.md), which recovers **one player's identity**
while the DB is alive and queryable. Two different "restores":

| Scenario | Doc | What it needs |
|---|---|---|
| One player lost their device / identity | [admin-restore.md](admin-restore.md) | DB is **up**; run SQL, issue a TransferCode |
| The whole DB is gone / corrupted | **this doc** | A **backup to restore from** (see below) |

`admin-restore.md` assumes `auth.users` and `player_profiles` still exist. If the
project itself is lost, there is nothing to query — this doc is the only path.

---

## Backup baseline

The project (`rnfsuvhgufhbekodkmlp`) is on the **Free plan**, which shapes the
whole procedure:

- **No automatic backups, no PITR** — those are Pro/Team/Enterprise only.
  Supabase's guidance for free projects is to self-export via the CLI `db dump`
  and keep off-site copies. So DR here rests entirely on the manual exports below.
- **Deleting a project is irreversible** and takes any stored backups with it.
- **One shared dev/prod project, permanently** — the same DB backs both dev and prod, so there
  is no isolation buffer: a bad migration reaches real data immediately, with no
  snapshot to roll back to. This is why a current off-site dump matters. A second
  project was considered and **rejected** ([ADR 0024](adr/0024-no-dev-prod-split-migration-safety-is-local.md));
  the free organization's second slot is deliberately held **empty as the restore
  target for the procedure below**, and migration safety is bought by rehearsing
  locally instead — `npm run db:rehearse`, see below.

---

## What must survive

Almost everything durable derives from a small set of tables. Back these up and
scores + achievements + stats all come back:

| Table | Why it's load-bearing |
|---|---|
| `game_scores` | **The crown jewel.** Append-forever. Leaderboards, Lifetime Stats and Streaks read full history off this. Lose it → lose everyone's record. |
| `player_achievements` | **Immutable earned-Achievement facts** — one row per Achievement a device earned, never revoked (ADR 0013). **Not derivable from anything else**: it is the only record that a Badge was ever earned. |
| `player_milestones` | **Append-only fact rows for every countable Badge input** — the `pangram` / `word` / `top_rank` / `tzimani` days behind all five tiered Badges (migration `20260807120000`, absorbing the former `player_pangrams` + `player_words`). Also not derivable: pangram and long-word finds are recorded as they happen and exist nowhere else. |
| `player_profiles` | Identity: `device_uuid` → `display_name` → `auth_user_id`, plus `selected_badge_id`. The device→account map. Lose it → players can't be re-linked to their history. |
| `identity_audit` | Append-only mapping history. Backs [admin-restore](admin-restore.md). Reconstructs every device↔account pair that ever existed. |
| `nominations` + `nomination_votes` | Community review work. Rejected rows are retained forever on purpose (ADR 0011) — `NominationModal` warns re-submitters off them. |
| `community_stavrolekso_puzzles` | Never deleted after approval — permanent, not consumed. |
| The other three `community_*_puzzles` | Approved rows carry a `scheduled_date` and are served non-destructively, so a live queue of future Daily Puzzles sits in them. |
| `transfer_codes` | 24h TTL — ephemeral, but cheap to include in a full dump. |

> **Achievements are stored facts, not derived state.** An older version of this doc
> said they were "derived on read from `game_scores`, so protecting `game_scores`
> protects achievements for free." That has been false since ADR 0013 shipped
> `player_achievements`, and doubly so since `player_milestones` absorbed the
> pangram and word capture. A dump that covers `game_scores` alone loses every
> earned Badge permanently — **earned means earned forever**, and there is nothing
> to recompute them from.

Everything above is included by `npm run db:backup` (it dumps roles + schema +
data for the whole database), so the practical rule is simply: take a full dump.
The table exists to say what a *partial* restore must not skip.

---

## Taking a backup

**The committed way — use this one:**

```bash
npm run db:backup      # → db-backups/<timestamp>/{roles,schema,data}.sql
                       #   + db-backups/<timestamp>.7z   ← this is the one you keep
```

`scripts/backup-db.ps1` runs `pg_dumpall --roles-only` plus two `pg_dump` passes
(schema, then data), then packs the folder into an **AES-256 encrypted 7-Zip
archive**. It needs the PostgreSQL client tools on the machine (`pg_dump` /
`pg_dumpall`) and `7z.exe` — Docker is not required. Both are preflighted before
the first dump runs, and `BACKUP_ARCHIVE_PASSWORD` must be set in `.env.local` or
the script refuses to start. There is deliberately **no unencrypted fallback**: a
backup that quietly loses its protection is worse than one that failed loudly.

**The archive is the artifact. The folder is scaffolding.** Upload the `.7z`.

Fallback if the client tools are unavailable — the `supabase` CLI (already an
approved devDependency, also no Docker):

```bash
supabase db dump --db-url "$SUPABASE_DB_URL" -f "backup-$(date +%Y%m%d).sql"
```

### Where it goes

**A private Google Drive folder.** Decided 2026-08-15; `TICKET-11` built the
encryption half and closed on 2026-08-20, when the folder was created (owner
only, no link sharing) and the first real archive was uploaded to it.

- **Never a git repository — not even a private one.** This repo is public,
  `db-backups/` is in `.gitignore` (line 46, *"local DB backups — never commit"*),
  and that rule is load-bearing. A full dump carries `auth.users`, so committing one
  publishes every signed-in player's email address **permanently**: deleting the
  file next commit leaves it in history for anyone who clones. Do not weaken the
  ignore rule and do not `git add -f` around it.
- **Not only in Supabase** either — that is the thing that might die.
- **Two copies beat one.** A cloud account you can lose access to is a single point
  of failure wearing a different hat; an external disk is a good second home.
- **The emails stay in the dump, on purpose.** Stripping the `auth` schema
  (`pg_dump --schema=public`) would produce an archive with no personal data and no
  usable restore: every gameplay row's `auth_user_id` would point at an account that
  no longer exists, so each signed-in player would come back a stranger to their own
  history. Encryption protects them; deletion would break them.
- **Cadence:** `game_scores` is append-forever, so a missed day only loses that
  day's *new* rows, never rewrites history. A daily-to-weekly schedule is
  proportionate at current DAU. Always take a fresh dump immediately before any
  risky migration.

## Rehearsing a migration

```bash
npm run db:rehearse
```

`scripts/rehearse-migration.ps1` restores the newest `db-backups/*.7z` into a local
scratch database (`greek_rehearsal`, dropped and recreated every run) and applies
the migrations in `supabase/migrations/` that the restored ledger has not seen —
each in its own transaction, stopping at the first failure and printing the
statement that failed. It needs `REHEARSAL_DB_URL` in `.env.local` pointing at the
**local** server; it refuses any host that is not localhost, because it issues a
`DROP DATABASE`. The extracted plaintext dump is deleted on the way out, including
after a failure.

**Run it before every `db push`** — most of all on release day, where the whole
migration queue lands in one afternoon on top of a table `launch-reset.sql` has
just emptied. The failures it catches are the ones an empty database passes:
`SET NOT NULL` meeting a column that has nulls, a unique index meeting rows that
are already duplicated, a foreign key or check that existing rows violate.

A pass means **the migrations apply**. It is not a green test suite (the live-DB
RLS checks go through Supabase's HTTP API, which a bare PostgreSQL does not have)
and not a statement about query plans (local is PostgreSQL 18, hosted is 17). See
[ADR 0024](adr/0024-no-dev-prod-split-migration-safety-is-local.md).

## Restoring from a backup

**1. Extract the archive.** You need `BACKUP_ARCHIVE_PASSWORD` — from the password
manager, because the machine that held `.env.local` is the machine you just lost.

```bash
7z x 20260815-104500.7z          # prompts for the password
```

**2. Replay the three files, in this order.** The order is not cosmetic: roles must
exist before objects that are owned by them, and the schema must exist before rows
can land in it.

```bash
psql "$TARGET_DB_URL" -f roles.sql     # roles first
psql "$TARGET_DB_URL" -f schema.sql    # then the empty structure
psql "$TARGET_DB_URL" -f data.sql      # then the rows
```

A single-file `supabase db dump` fallback is one command instead of three:

```bash
psql "$TARGET_DB_URL" -f backup-YYYYMMDD.sql
```

**3. Repoint the app.** Restore into a fresh project, then update
`NEXT_PUBLIC_SUPABASE_URL` + keys in Vercel and `.env.local`. Custom-role passwords
are *not* included in dumps — we have no custom roles, so this doesn't bite us.
Google OAuth is per-project configuration and does **not** travel in the dump; see
[google-oauth-setup.md](google-oauth-setup.md) and expect to redo it.

> **Test the extraction, not the existence.** An archive that is present is a
> response; an archive that opens **on a different machine** with the password from
> your password manager is the artifact. Do that once now, not on the day the
> database is gone.

## See also
- [admin-restore.md](admin-restore.md) — single-player identity recovery (DB alive).
- [ADR 0012](adr/0012-signin-restore-adopts-device-identity.md) — why `game_scores` is
  append-forever and identity is device-keyed.
- [google-oauth-setup.md](google-oauth-setup.md) — auth provisioning (per-project config).
- CONTEXT.md → *Persistence decisions* — the append-forever guarantees this doc leans on.
- [ADR 0024](adr/0024-no-dev-prod-split-migration-safety-is-local.md) — why there is only one
  project, and why the second free slot stays empty for the restore above.
- Open work (the archive password, the first real dump, the upload) is tracked in the issue
  tracker: `.claude/tracker/issues/ISSUE-01-no-disaster-recovery-backups.md` §1.
