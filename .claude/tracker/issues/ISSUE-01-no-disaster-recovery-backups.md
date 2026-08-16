# The database's deferred problems — no disaster recovery, and two findings that wait on it

**Deferred:** 2026-07-05 (backups); the rest 2026-08-15
**Revisit when:** each section carries its own trigger — they do not share one. The **dev/prod
split** in section 1 is the pivot: section 2 is blocked on it outright, so grill that first.

**Consolidated 2026-08-16** from `ISSUE-06` (profile scans) and `ISSUE-07` (nominations growth), at
the operator's request — one DB file instead of several. The `is_perfect` DROP stayed out on
purpose: it is no longer a deferred problem but **scheduled work**, owned by
[`ISSUE-05`](ISSUE-05-dead-is-perfect-column.md) and executed at release-day runbook step 5.

**What binds these together:** one Free-plan Supabase project (`rnfsuvhgufhbekodkmlp`) backs both
dev and prod, with no automatic backups, no PITR and no scratch copy. That single fact is why
section 1 is unfixed, why a restore has never been rehearsed, and why section 2 cannot be
*measured*.

---

## 1. No disaster-recovery backups, and no dev/prod split

**Revisit when:** before the public launch, or the moment a risky migration is queued.

The Free plan has **no automatic backups and no PITR** — those are Pro+ only. Verified against the
Supabase Database Backups guide: free projects are told to self-export via the CLI. So if the DB is
deleted, corrupted, or wiped by a bad migration, everyone's scores and derived achievements are
**unrecoverable**. Amplified by the shared project: a bad dev migration hits prod instantly with no
rollback point.

The "somewhere to put the dumps" question is **answered** — an encrypted 7-Zip archive in a private
Google Drive folder, never a git repository (the repo is public and `pg_dump` carries `auth.users`).
[`TICKET-11`](../tickets/TICKET-11-offsite-encrypted-backup.md) shipped the encryption half of
`scripts/backup-db.ps1` on 2026-08-15; its **operator half is still owed** and must be done before
runbook step 3.

Two things stay deferred here:

- **Automating an off-site dump** needs a scheduler and a destination. The destination is settled;
  `db:backup:schedule-weekly` exists but is not wired to Drive. Blocked on the split below, because
  where you schedule from depends on how many projects there are.
- **The dev/prod split** — two separate free Supabase projects (a free org allows two) versus staying
  single. Structural, and needs a grill: isolation weighed against double-maintaining migrations,
  secrets and OAuth config. **Promote to a ticket once this is decided** — it is what unblocks the
  automation, section 2's verification, and any future rehearsal of section 4.

Full context, the "what must survive" table and the restore procedure live in
[`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md).

---

## 2. `player_profiles` is served almost entirely by sequential scans

**Revisit when:** `player_profiles` passes roughly 5,000 rows, or leaderboard latency becomes
visible. Both are launch-scale events, not today's 47 rows.

`pg_stat_user_tables` on 2026-08-15, for 47 live rows: `seq_scan` 9,047 · `seq_tup_read` 363,185 ·
`idx_scan` 133 · `last_autovacuum` never. **98.5% of accesses are full table scans.** For comparison
`game_scores` runs 45,009 index scans against 7,624 sequential ones — profiles is the outlier.

Per-index usage: `player_profiles_device_uuid_key` 97 scans, `player_profiles_pkey` 36,
`player_profiles_auth_user_id_key` **0**. That unique index has never been used once, despite
[`src/app/api/auth/link/route.ts:89`](../../../src/app/api/auth/link/route.ts#L89) selecting on the
column. At 47 rows the planner correctly prefers a sequential scan, so this is expected small-table
behaviour rather than a missing index — but the index has never been *proven* and the crossover has
never been exercised.

The cost is zero today. It stops being zero when the table grows: every leaderboard GET calls
`resolveProfiles()` ([`src/app/api/game-scores/route.ts`](../../../src/app/api/game-scores/route.ts)),
an `in()` over up to 21 device UUIDs, and since 2026-08-15 that same query resolves every *display
name* on the leaderboard — making it the hottest read against this table. If it resolves as a
sequential scan at 50,000 profiles, each leaderboard open reads 50,000 rows. `last_autovacuum` being
null with 20 dead tuples is worth a glance too: the table's statistics are whatever the last manual
`ANALYZE` left, and a planner on stale statistics is exactly how a crossover gets missed.

**The work this reserves is a verification, not a change** — adding indexes against a 47-row table
would be cargo-culting:

1. Seed a scratch copy of `player_profiles` to ~50,000 rows.
2. `EXPLAIN ANALYZE` the `resolveProfiles()` `in()` query and the `/api/auth/link` `auth_user_id`
   lookup against it.
3. Confirm both flip to index scans. If not, that is the real bug and it gets its own ticket.

**Blocked on section 1's split** — that needs a scratch database, and a 50,000-row seed against the
live project is exactly the write the CLAUDE.md guardrails exist to prevent.

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
and `pending` accumulates forever if nobody reviews it. Measured: 190 live rows, 2 pending.

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
a size one), and the listing GET already scanning (4,655 sequential scans reading 697,815 tuples at
190 rows — fine now, linear later).

**This does not reopen the accepted risk.** `reflections.md` carries an *"API rate limiting (accepted
risk)"* entry covering anon INSERT spam across all routes, with a ~500 DAU trigger and a 5,000-row
`nominations` tripwire in its monitoring SQL; read it first, it holds the measured quota table. What
is recorded here is the nominations-specific half that a rate limit would not fix: the retention
asymmetry and the moderation-queue consequence.

**Why deferred** — every real fix needs an undecided decision. *Rate limiting* needs a throttle key
that is not `device_id`, meaning IP-based limiting at the edge (Vercel firewall rules) or a Postgres
counter table, with cost implications either way. *Pruning rejected* is easy but removes what stops a
word being re-nominated and re-reviewed forever — it needs a replacement de-duplication mechanism,
most likely a small `rejected_words` set outliving the rows. *Pruning stale pending* presumes a
review SLA that does not exist. None should be guessed at under launch pressure.

---

## References

- [`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md) — the runbook section 1 tracks the open work for.
- Supabase Database Backups — https://supabase.com/docs/guides/platform/backups (free-tier `db dump` guidance).
- [`TICKET-11`](../tickets/TICKET-11-offsite-encrypted-backup.md) — the encrypted dump; agent half shipped, operator half owed.
- [`ISSUE-05`](ISSUE-05-dead-is-perfect-column.md) — the `is_perfect` DROP, scheduled to runbook step 5 rather than deferred here.
- [`src/app/api/game-scores/route.ts`](../../../src/app/api/game-scores/route.ts) — `resolveProfiles()`, the hottest read against `player_profiles` (section 2).
- [`src/app/api/cleanup-scores/route.ts`](../../../src/app/api/cleanup-scores/route.ts) + [`src/config/retention.ts`](../../../src/config/retention.ts) — the prune and what it deliberately skips.
- `.claude/skills/project-mcp/SKILL.md` — the advisor baseline explaining why the always-true INSERT policy is intended.
- The `supabase` CLI is an approved devDependency; `db push` works without Docker.
