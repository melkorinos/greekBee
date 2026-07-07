# No disaster-recovery backups — free-tier project has no net against total DB loss

Status: needs-triage

## What's missing

The Supabase project (`rnfsuvhgufhbekodkmlp`) is on the **Free plan**, which has **no automatic backups and no PITR** — those are Pro+ only. Verified against Supabase docs (Database Backups guide): free projects are told to self-export via the CLI. So if the DB is deleted, corrupted, or wiped by a bad migration, everyone's scores and (derived) achievements are **unrecoverable** — there is currently no dump to restore from.

Amplified by the **single shared dev/prod project** (one DB backs both dev and prod), so a bad dev migration hits prod instantly with no rollback point.

Full context, the "what must survive" table, and restore procedure live in [`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md).

## Pending work

- [ ] **Automate an off-site `supabase db dump`** (scheduled) so a restorable backup always exists. Interim rule until then: take a manual dump before any risky migration.
- [ ] **Decide the dev/main split** — two separate free Supabase projects (free orgs allow two) vs. staying single. Structural, needs a grill; weigh isolation against double-maintaining migrations/secrets/OAuth config.

## Why it's an issue, not just a doc checklist

`docs/disaster-recovery.md` documents the *state and options*, but the pending work needs to be visible in triage rather than buried in a runbook — hence this ticket. Close it when a backup mechanism exists and the split is decided (or explicitly deferred).

## References

- [`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md) — the runbook this ticket tracks the open work for.
- Supabase Database Backups — https://supabase.com/docs/guides/platform/backups (free-tier `db dump` guidance).
- The `supabase` CLI is already an approved devDependency; `db push` works without Docker.
