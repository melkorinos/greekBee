# The database's deferred problem — nominations moderation

**Deferred:** 2026-08-15
**Revisit when:** section 3 carries its own trigger, below.

**Consolidated 2026-08-16** from `ISSUE-06` (profile scans) and `ISSUE-07` (nominations growth), at
the operator's request — one DB file instead of several. Two of the three sections have since left,
and **their numbers are not reused**, because ADR 0011, ADR 0024, ADR 0026 and `TICKET-13` all cite
them:

- **Section 1 (backups) was promoted to `TICKET-25` on 2026-08-21.** It stopped being a deferred
  problem when `TICKET-11` closed: the encryption shipped, the private Drive folder exists, one
  archive is uploaded, and the ordering rule that held the weekly task back is spent. What was owed
  — register the schedule, upload what is on disk, extract an archive on a second machine, decide
  the password length — is executable today, so it moved rather than sat here.
- **Section 2 was discharged 2026-08-17** by `TICKET-14`'s local measurement: at 5,000 rows the
  planner switches to `player_profiles_device_uuid_key` for `resolveProfiles()` and to
  `player_profiles_auth_user_id_key` for `/api/auth/link`, exactly as the section predicted. The
  existing indexes are correct and nothing was owed.

The `is_perfect` DROP stayed out of the consolidation on purpose — it was scheduled work rather than
a deferred problem, and it **shipped 2026-08-21** in the one migration ADR 0027 §5 called for, which
also carried section 3's index and sigma fix.

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
a size one), and **the lookup already full-scanning the table** — `nominations` carried only the
primary key and the partial unique on `(word, direction) WHERE status = 'pending'`, so the `rejected`
and `accepted` counts in `GET /api/nominations/lookup` matched no index at all, and it grows in
exactly the rows nothing prunes.

**The index shipped 2026-08-20** in `20260820120000_drop_two_community_queues_and_dead_score_columns.sql`, and it earned its place — **measured 2026-08-17, `TICKET-14`.** A local probe at 191 / 5,000 /
50,000 rows seeded at the live status mix: without `(word, direction, status)` the lookup counts
sequentially scan at every scale, reading 1,064 buffers and 2.77 ms at 50,000 rows; with it the
planner chooses an index-only scan **at every scale including today's 191**, at 3 buffers and
0.04 ms. The index costs about 2 MB at 50,000 rows.

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

**One operator decision is still open.** It outlived `TICKET-14`, which carried it only because that
was the next file anyone would open, and shipped on 2026-08-17 without answering it:

1. **Does the moderation half leave as its own issue?** Retention is affirmed and the index has a
   verdict, so what is left here — no bulk-reject in `/leksikastirio`, and stranger-authored
   `word`/`note` free text rendered in an admin UI — is a review-workflow problem with nothing to do
   with the database. If it leaves, it takes the next free issue number.

**The one non-normalised row is fixed** (2026-08-20): `ιουνιος` (`direction` `remove`, rejected
2026-07-15) ended in a final sigma, so `normalizeLetters` turned a re-proposal into `ιουνιοσ` and its
prior-rejection warning could never fire. It was the only such row in 191, and `isBlockedWord` does
not cover it because that only runs on `add`. The `UPDATE` rode the same migration as the index. It was
legacy residue, not a live hole: `POST /api/nominations` writes `normalizeLetters(word).trim()`
([route.ts:119](../../../src/app/api/nominations/route.ts#L119)), so no new row can arrive that way.

---

## References

- `TICKET-25` — the backup work this file held as section 1 until 2026-08-21.
- [ADR 0024](../../../docs/adr/0024-no-dev-prod-split-migration-safety-is-local.md) — why there is no dev/prod split, and what replaced it. Read before re-proposing a second project.
- [`src/app/api/cleanup-scores/route.ts`](../../../src/app/api/cleanup-scores/route.ts) + [`src/config/retention.ts`](../../../src/config/retention.ts) — the prune and what it deliberately skips.
- `.claude/skills/project-mcp/SKILL.md` — the advisor baseline explaining why the always-true INSERT policy is intended.
