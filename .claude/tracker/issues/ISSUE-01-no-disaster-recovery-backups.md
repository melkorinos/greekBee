# The database's deferred problems — two findings, two triggers

**Deferred:** 2026-07-05 (backups); the rest 2026-08-15
**Revisit when:** each section carries its own trigger — they do not share one, and no section
gates another.

**Section 2 is gone, discharged 2026-08-17** by `TICKET-14`'s local measurement: at 5,000 rows the
planner switches to `player_profiles_device_uuid_key` for `resolveProfiles()` and to
`player_profiles_auth_user_id_key` for `/api/auth/link`, exactly as the section predicted. The
existing indexes are correct and nothing was owed. **The number is not reused** — sections 1 and 3
keep theirs, because ADR 0011, ADR 0026 and `TICKET-13` all cite them.

**Consolidated 2026-08-16** from `ISSUE-06` (profile scans) and `ISSUE-07` (nominations growth), at
the operator's request — one DB file instead of several. The `is_perfect` DROP stayed out on
purpose: it is no longer a deferred problem but **scheduled work**, owned by
[`ISSUE-05`](ISSUE-05-dead-is-perfect-column.md) and executed at release-day runbook step 5.

**These sections share a subject, not a cause.** The consolidation originally claimed a common
blocker — one Free-plan project with no scratch copy, said to be why section 2 could not be
*measured*. [ADR 0024](../../../docs/adr/0024-no-dev-prod-split-migration-safety-is-local.md)
dissolved that on 2026-08-16: the dev/prod split was decided against, and section 2's verification
turned out to need a local database rather than a hosted one — and once it was run, section 2 was
discharged outright. What remains is two unrelated findings that happen to be about the same
database. Read the section you came for; the other will not tell you anything about it.

---

## 1. No disaster-recovery backups — and right now, no backup at all

**Revisit when:** before the public launch, or the moment a risky migration is queued.

The Free plan has **no automatic backups and no PITR** — those are Pro+ only. Verified against the
Supabase Database Backups guide: free projects are told to self-export via the CLI. So if the DB is
deleted, corrupted, or wiped by a bad migration, everyone's scores and derived achievements are
**unrecoverable**.

**The split question is closed.**
[ADR 0024](../../../docs/adr/0024-no-dev-prod-split-migration-safety-is-local.md) decided against a
second Supabase project on 2026-08-16: the second free slot is reserved as the disaster-restore
target, an empty staging database passes exactly the migrations that hurt, and seeding one from a
production dump would put a second permanent copy of every player's email in the cloud. Migration
safety is bought locally instead — [`TICKET-13`](../tickets/TICKET-13-migration-rehearsal-loop.md)
is the promotion this section's old *"promote to a ticket once the split is decided"* line called
for.

The "somewhere to put the dumps" question is **answered** — an encrypted 7-Zip archive in a private
Google Drive folder, never a git repository (the repo is public and `pg_dump` carries `auth.users`).
[`TICKET-11`](../tickets/TICKET-11-offsite-encrypted-backup.md) shipped the encryption half of
`scripts/backup-db.ps1` on 2026-08-15.

### What is actually owed — all of it operator-only, measured 2026-08-16

The exposure is worse than "automation is missing". There is **no usable backup on the machine at
all**:

- `BACKUP_ARCHIVE_PASSWORD` is documented at `.env.local.example:38` but **absent from the real
  `.env.local`**, so `npm run db:backup` throws at
  [`backup-db.ps1:107`](../../../scripts/backup-db.ps1#L107) before dumping anything.
- `db-backups/` holds **two unencrypted folders, newest 2026-08-08** — both predate the encryption
  work. There is no `.7z` anywhere.
- The weekly task **is not registered** (`Get-ScheduledTask GreekWordGames-DB-Backup` → not found).

The order matters, and it is not the order the runbook implies. Registering the scheduled task
first would create a job that fails every Sunday at 02:00 unattended — **worse than no job, because
it looks like coverage.** Set the password, take one manual dump, confirm the archive opens on
another machine, *then* register the task.

The one thing that stays deferred after that is **nothing enforces the upload**. The dump lands in
`db-backups/` and a human has to move it to Drive; a dump still sitting on the machine at runbook
step 4 means the launch wipe has no undo. Automating the upload needs a Drive credential on the
machine, which is a decision nobody has made.

Full context, the "what must survive" table and the restore procedure live in
[`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md).

---

## 3. Rejected and pending nominations are never pruned, and anyone can INSERT

**Revisit when:** the public launch opens the nomination form to strangers, or `nominations` passes
~5,000 rows. Today the audience is friends-and-family, which is the only thing holding this down.

Two facts combine badly.

**Nothing prunes most of the table.** The nightly cron at
[`src/app/api/cleanup-scores/route.ts:49-52`](../../../src/app/api/cleanup-scores/route.ts#L49-L52)
deletes nominations only when all three hold: `status = 'accepted'`, `reviewed_at IS NOT NULL`, and
`reviewed_at` older than `NOMINATION_APPLIED_RETENTION_DAYS` (30). Its comment states the intent
plainly — *"Rejected and pending nominations are never deleted."* So `rejected` accumulates forever,
and `pending` accumulates forever if nobody reviews it. Measured 2026-08-16: **191 rows — 148
rejected, 41 accepted, 2 pending**. `pending` is the least of it: the partial unique index admits one
pending row per `(word, direction)`, so that queue is bounded by distinct words, not by volume.

**Anyone can insert.** RLS on `nominations` is a deliberate permissive open-INSERT policy (one of the
15 `rls_policy_always_true` warnings the project-mcp skill documents as by-design), and the route
applies no rate limit, no captcha and no per-device quota. `device_id` is client-supplied, so it is
trivially spoofable and cannot be a throttle key. Write churn relative to size is already visible:
2,911 inserts and 2,363 deletes against 190 live rows. Votes cascade correctly on delete
(`nomination_votes_nomination_id_fkey ... ON DELETE CASCADE`, verified — 0 orphans), so votes are not
an independent leak.

The exposure is not storage — a row is ~200 bytes. The real costs are the **review queue becoming
unusable** (`/leksikastirio` lists pending nominations and there is no bulk-reject), **`word` and
`note` being free text written by strangers and rendered in an admin UI** (a moderation problem, not
a size one), and **the lookup already full-scanning the table** — `nominations` carries only the
primary key and the partial unique on `(word, direction) WHERE status = 'pending'`, so the `rejected`
and `accepted` counts in `GET /api/nominations/lookup` match no index at all, and it grows in
exactly the rows nothing prunes.

**The index earns its place — measured 2026-08-17, `TICKET-14`.** A local probe at 191 / 5,000 /
50,000 rows seeded at the live status mix: without `(word, direction, status)` the lookup counts
sequentially scan at every scale, reading 1,064 buffers and 2.77 ms at 50,000 rows; with it the
planner chooses an index-only scan **at every scale including today's 191**, at 3 buffers and
0.04 ms. The index costs about 2 MB at 50,000 rows. Its body is written into **runbook step 5**,
beside the `is_perfect` DROP, because `supabase/migrations/` is frozen until then.

The same probe qualifies this section's attribution of the sequential scans. The listing GET does
**not** stay unindexed as the table grows — the existing partial unique on `(word, direction) WHERE
status = 'pending'` picks it up as a bitmap index scan from 5,000 rows onward. But at today's 191
rows it sequentially scans too, so the 4,655 scans are both queries, not the lookup alone. Only the
lookup never improves on its own.

**This does not reopen the accepted risk.** `CONTEXT.md`'s *Persistence decisions → API rate
limiting* entry covers anon INSERT spam across all routes, with a ~500 DAU trigger and the monitoring
SQL; read it first, it holds the constraint ranking and the Pro trigger. What
is recorded here is the nominations-specific half that a rate limit would not fix: the retention
asymmetry and the moderation-queue consequence.

**Two of the three questions here are now closed** (grilled 2026-08-16, recorded as ADR 0011's
amendment). *Pruning rejected* is decided against, and so is the `rejected_words` set this section
used to propose as its replacement: a rejected row is both a **Nomination** and the standing
**Refusal** that warns a re-proposer, and keeping it is cheaper than rebuilding the second half
elsewhere. *Pruning stale pending* is moot — see the bound above; no review SLA is owed.

**What is still deferred is the moderation half**, which no retention rule and no rate limit
addresses: there is no bulk-reject, and `word`/`note` are stranger-authored free text rendered in an
admin UI. *Rate limiting* stays with the platform-wide accepted risk and is not re-opened here — it
would need a throttle key that is not the spoofable `device_id`, meaning edge IP limiting or a
Postgres counter table, with cost implications either way.

**Two operator decisions are open, and they outlived `TICKET-14`** — that ticket carried them only
because it was the next file anyone would open, and it shipped on 2026-08-17 without answering
either:

1. **Does the moderation half leave as its own issue?** Retention is affirmed and the index has a
   verdict, so what is left here — no bulk-reject in `/leksikastirio`, and stranger-authored
   `word`/`note` free text rendered in an admin UI — is a review-workflow problem with nothing to do
   with the database. If it leaves, it takes the next free issue number.
2. **When does the one non-normalised row get fixed?** `ιουνιος` (`direction` `remove`, rejected
   2026-07-15) ends in a final sigma, so `normalizeLetters` turns a re-proposal into `ιουνιοσ` and
   its prior-rejection warning can never fire. It is the only such row in 191, and `isBlockedWord`
   does not cover it because that only runs on `add`. It is a data `UPDATE`, not DDL, so the
   migrations freeze does not reach it — runbook step 5, or the dashboard at any time.

---

## References

- [ADR 0024](../../../docs/adr/0024-no-dev-prod-split-migration-safety-is-local.md) — why there is no dev/prod split, and what replaced it. Read before re-proposing a second project.
- [`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md) — the runbook section 1 tracks the open work for.
- Supabase Database Backups — https://supabase.com/docs/guides/platform/backups (free-tier `db dump` guidance).
- [`TICKET-11`](../tickets/TICKET-11-offsite-encrypted-backup.md) — the encrypted dump; agent half shipped, operator half owed.
- [`TICKET-13`](../tickets/TICKET-13-migration-rehearsal-loop.md) — the local rehearsal loop ADR 0024 chose instead of a split.
- [`ISSUE-05`](ISSUE-05-dead-is-perfect-column.md) — the `is_perfect` DROP, scheduled to runbook step 5 rather than deferred here.
- [`src/app/api/cleanup-scores/route.ts`](../../../src/app/api/cleanup-scores/route.ts) + [`src/config/retention.ts`](../../../src/config/retention.ts) — the prune and what it deliberately skips.
- `.claude/skills/project-mcp/SKILL.md` — the advisor baseline explaining why the always-true INSERT policy is intended.
- The `supabase` CLI is an approved devDependency; `db push` works without Docker.
