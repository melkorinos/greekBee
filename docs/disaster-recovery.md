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
- **One shared dev/prod project** — the same DB backs both dev and prod, so there
  is no isolation buffer: a bad migration reaches real data immediately, with no
  snapshot to roll back to. This is why a current off-site dump matters.

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
```

`scripts/backup-db.ps1` runs `pg_dumpall --roles-only` plus two `pg_dump` passes
(schema, then data). It needs the PostgreSQL client tools on the machine
(`pg_dump` / `pg_dumpall`) — Docker is not required.

Fallback if the client tools are unavailable — the `supabase` CLI (already an
approved devDependency, also no Docker):

```bash
supabase db dump --db-url "$SUPABASE_DB_URL" -f "backup-$(date +%Y%m%d).sql"
```

- Store the dump **off-site** — not in this repo (it contains player data) and not
  only in Supabase (the thing that might die). A private object store or an
  encrypted file the maintainer holds is enough at this scale.
- **Cadence:** `game_scores` is append-forever, so a missed day only loses that
  day's *new* rows, never rewrites history. A daily-to-weekly schedule is
  proportionate at current DAU. Always take a fresh dump immediately before any
  risky migration.

## Restoring from a backup

```bash
psql "$TARGET_DB_URL" -f backup-YYYYMMDD.sql
```

Restore into a fresh project, then repoint `NEXT_PUBLIC_SUPABASE_URL` + keys in
Vercel and `.env.local`. Custom-role passwords are *not* included in dumps — we
have no custom roles, so this doesn't bite us.

## See also
- [admin-restore.md](admin-restore.md) — single-player identity recovery (DB alive).
- [ADR 0012](adr/0012-signin-restore-adopts-device-identity.md) — why `game_scores` is
  append-forever and identity is device-keyed.
- [google-oauth-setup.md](google-oauth-setup.md) — auth provisioning (per-project config).
- CONTEXT.md → *Persistence decisions* — the append-forever guarantees this doc leans on.
- Open work (automating dumps, the dev/main split decision) is tracked in the issue
  tracker: `.claude/tracker/issues/ISSUE-01-no-disaster-recovery-backups.md`.
