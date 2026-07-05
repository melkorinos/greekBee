# Disaster Recovery — surviving total DB loss

How we get everyone's scores and achievements back if the **whole database** dies
(project deleted, corrupted, wiped by a bad migration). This is *not* the same as
[`admin-restore.md`](admin-restore.md), which recovers **one player's identity**
while the DB is alive and queryable. Two different "restores":

| Scenario | Doc | What it needs |
|---|---|---|
| One player lost their device / identity | [admin-restore.md](admin-restore.md) | DB is **up**; run SQL, issue a TransferCode |
| The whole DB is gone / corrupted | **this doc** | A **backup to restore from** — and on free tier, we make our own |

`admin-restore.md` assumes `auth.users` and `player_profiles` still exist. If the
project itself is lost, there is nothing to query — this doc is the only net.

---

## The uncomfortable baseline: on free tier we have no net

Supabase auto-backups (daily snapshots + Point-in-Time Recovery) are a **paid**
feature — Pro/Team/Enterprise only. Our project (`rnfsuvhgufhbekodkmlp`) is on the
**Free plan**, so:

- **No automatic backups. No PITR. Nothing.** Supabase's own guidance for free
  projects is: *"regularly export their data using the Supabase CLI `db dump`
  command and maintain off-site backups."*
- **Deleting a project is irreversible** and takes any stored backups with it.
- This is amplified by the **single shared dev/prod project** (see below): a bad
  dev migration hits prod instantly, with no isolation buffer and no snapshot to
  roll back to.

So today, "restore everyone's achievements and scores after a complete failure"
= *whatever manual dump we last took*. If we've never taken one, the answer is
**we can't**. Fixing that is the point of this doc.

---

## What actually needs to survive

Almost everything durable derives from a small set of tables. Back these up and
scores + achievements + stats all come back:

| Table | Why it's load-bearing |
|---|---|
| `game_scores` | **The crown jewel.** Append-forever. Leaderboards, Lifetime Stats, Streaks, and all derived-on-read Achievements read full history off this. Lose it → lose everyone's record. |
| `player_profiles` | Identity: `device_uuid` → `display_name` → `auth_user_id`. The device→account map. Lose it → players can't be re-linked to their history. |
| `identity_audit` | Append-only mapping history. Backs [admin-restore](admin-restore.md). Reconstructs every device↔account pair that ever existed. |
| `community_stavrolekso_puzzles` | Never deleted after approval — the only community content that's permanent, not consumed. |
| `transfer_codes` | 24h TTL — ephemeral, low value to back up, but cheap to include in a full dump. |

Achievements are (today) **derived on read from `game_scores`**, not a separate
stored table — so protecting `game_scores` protects achievements for free. If an
`achievements` facts table is added later (ADR 0012 anticipates
`(device_uuid, achievement_id)` rows), **add it to this list.**

---

## The cheap fix (do this): scheduled off-site `db dump`

Zero-cost DR that works on the free tier. The `supabase` CLI is already an
approved devDependency.

```bash
# Full logical backup — schema + data — to a timestamped file off the DB host.
supabase db dump --db-url "$SUPABASE_DB_URL" -f "backup-$(date +%Y%m%d).sql"
```

- Store the dump **off-site** (not in this repo — it contains player data; and
  not only in Supabase, which is the thing that might die). A private object
  store or an encrypted file the maintainer holds is enough at this scale.
- **Cadence:** `game_scores` is append-forever, so a lost day of dumps only loses
  that day's *new* rows, never rewrites history. A daily or weekly cron is
  proportionate at current DAU.
- **Restore path:** `psql "$TARGET_DB_URL" -f backup-YYYYMMDD.sql` into a fresh
  project, then repoint `NEXT_PUBLIC_SUPABASE_URL` + keys in Vercel and
  `.env.local`. (Passwords for custom roles are *not* in dumps — we have none, so
  this doesn't bite us.)

> Not yet automated. Until a cron exists, DR is only as good as the last manual
> dump. Treat "take a dump before any risky migration" as the interim rule.

---

## The structural fix (decide): split dev from main

The standing risk is the **one shared dev/prod project** — every migration and
every dev test-run hits the same tables real players use, with no rollback point.
The user's goal is a "safe main DB" isolated from dev experimentation.

Free-tier constraints on the *proper* isolation tools:

- **Supabase Branching is paid** (Pro+) — it spins up billed preview instances,
  so it's not available to us. This is why we can't branch the DB "the right way."
- **Local stack / `db reset`** needs Docker, which isn't installed (and isn't
  required for `db push`).

Workaround that costs $0 and gives real isolation:

- **Run two separate free Supabase projects** — a `dev` project and a `main`
  (prod) project. Free organizations allow up to two active projects, which is
  exactly a dev+prod split. Migrations get applied to `dev` first (`db push`
  against the dev URL), verified, then applied to `main`. Vercel prod points at
  `main`; local/preview points at `dev`. Real players never share tables with
  e2e runs, and a bad migration can't reach prod until you push it there.
- **Cost:** free projects pause after inactivity, so the dev one needs an
  occasional ping or a manual unpause — acceptable for a staging DB. Also doubles
  the number of Google-OAuth/redirect allow-lists to maintain (see
  [google-oauth-setup.md](google-oauth-setup.md)) and means secrets/migrations
  must be applied to two places.

**Status: undecided, not a blocker.** This is the structural upgrade to the "safe
main DB" goal; the scheduled `db dump` above is the immediate mitigation that
should land regardless of whether we split.

---

## Open follow-ups

- [ ] **Automate the dump** — a scheduled `supabase db dump` to off-site storage.
      Until then, DR = last manual dump; take one before any risky migration.
- [ ] **Decide dev/main split** — two free projects vs. staying single. Weigh the
      isolation win against double-maintaining migrations, secrets, and OAuth
      config.
- [ ] **When an `achievements` table lands** — add it to "What needs to survive."

## See also
- [admin-restore.md](admin-restore.md) — single-player identity recovery (DB alive).
- [ADR 0012](adr/0012-signin-restore-adopts-device-identity.md) — why `game_scores` is
  append-forever and identity is device-keyed.
- [google-oauth-setup.md](google-oauth-setup.md) — auth provisioning, doubled under a split.
- CONTEXT.md → *Persistence decisions* — the append-forever guarantees this doc leans on.
