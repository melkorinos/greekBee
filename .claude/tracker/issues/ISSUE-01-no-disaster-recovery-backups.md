# No disaster-recovery backups — free-tier project has no net against total DB loss

**Deferred:** 2026-07-05
**Revisit when:** before the public launch, or the moment a risky migration is queued — whichever
comes first. A manual `supabase db dump` is the interim rule until then.

## Problem

The Supabase project (`rnfsuvhgufhbekodkmlp`) is on the **Free plan**, which has **no automatic backups and no PITR** — those are Pro+ only. Verified against Supabase docs (Database Backups guide): free projects are told to self-export via the CLI. So if the DB is deleted, corrupted, or wiped by a bad migration, everyone's scores and (derived) achievements are **unrecoverable** — there is currently no dump to restore from.

Amplified by the **single shared dev/prod project** (one DB backs both dev and prod), so a bad dev migration hits prod instantly with no rollback point.

Full context, the "what must survive" table, and restore procedure live in [`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md).

## Half of this moved to TICKET-11 on 2026-08-15

The "somewhere to put the dumps" question is **answered**: an encrypted 7-Zip archive in a private
Google Drive folder, never a git repository (the repo is public and the dump carries `auth.users`).
[`TICKET-11`](../tickets/TICKET-11-offsite-encrypted-backup.md) builds the encryption half of
`scripts/backup-db.ps1` and documents the restore. **What is still deferred here is the automation
and the dev/prod split** — the scheduler question stays open because it depends on the split, and
the split needs a grill.

## Why deferred

Neither half is a small fix, and both are cheaper to do once the launch shape is settled:

- **Automating an off-site `supabase db dump`** needs a scheduler and somewhere to put the dumps — a real
  decision, not a script. *(The destination half is now settled — see above.)*
- **The dev/main split** — two separate free Supabase projects (free orgs allow two) versus staying single —
  is structural and needs a grill; isolation has to be weighed against double-maintaining migrations,
  secrets, and OAuth config.

`docs/disaster-recovery.md` documents the state and the options; this file exists so the exposure stays
visible rather than buried in a runbook. Delete it when a backup mechanism exists and the split is decided.

**Promote to a ticket** once the split decision is made — that is what unblocks writing the automation.

## References

- [`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md) — the runbook this issue tracks the open work for.
- Supabase Database Backups — https://supabase.com/docs/guides/platform/backups (free-tier `db dump` guidance).
- The `supabase` CLI is already an approved devDependency; `db push` works without Docker.
