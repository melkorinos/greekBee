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
| `game_scores` | **The crown jewel.** Append-forever. Leaderboards, Lifetime Stats, Streaks, and all derived-on-read Achievements read full history off this. Lose it → lose everyone's record. |
| `player_profiles` | Identity: `device_uuid` → `display_name` → `auth_user_id`. The device→account map. Lose it → players can't be re-linked to their history. |
| `identity_audit` | Append-only mapping history. Backs [admin-restore](admin-restore.md). Reconstructs every device↔account pair that ever existed. |
| `community_stavrolekso_puzzles` | Never deleted after approval — the only community content that's permanent, not consumed. |
| `transfer_codes` | 24h TTL — ephemeral, but cheap to include in a full dump. |

Achievements are (today) **derived on read from `game_scores`**, not a separate
stored table — so protecting `game_scores` protects achievements for free. If an
`achievements` facts table is added later (ADR 0012 anticipates
`(device_uuid, achievement_id)` rows), add it to this list.

---

## Taking a backup

Full logical backup — schema + data — via the `supabase` CLI (already an approved
devDependency; needs no Docker):

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
  tracker: `.claude/issue-tracker/issues/02-no-disaster-recovery-backups.md`.
