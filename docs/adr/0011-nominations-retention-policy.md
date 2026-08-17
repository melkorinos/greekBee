# ADR 0011 — Nominations retention: rejected rows kept forever; accepted rows deleted 30 days after apply

**Status**: Accepted

## Context

The `nominations` table accumulates rows over time. Three statuses exist: `pending`, `accepted`, `rejected`. The question is which rows to clean up and when.

`reviewed_at` already has a dual meaning established by the apply CLI (`scripts/apply-nominations.ts`; it was `apply-nominations.mjs` when this was written — ADR 0015 converted it to TypeScript): when an admin approves a Nomination the column stays `null`; the CLI script sets `reviewed_at = now()` after patching the word-list files. So `reviewed_at IS NULL` on an accepted row means "applied pending" and `IS NOT NULL` means "applied".

## Decision

- **`pending`** — never deleted (awaiting admin review).
- **`rejected`** — never deleted. `NominationModal` queries `/api/nominations/lookup` on open and warns the player when a prior rejection exists for the same word + direction, making the explanation note mandatory before re-submission. Deleting rejected rows would silently remove that guardrail.
- **`accepted`** — deleted 30 days after `reviewed_at` is set (i.e. after the word has been live for at least 30 days). The row has no runtime function at that point.

Cleanup runs in the existing daily Vercel Cron at `/api/cleanup-scores`. No new endpoint is needed.

## Reasons

- A separate `applied_at` column was considered but `reviewed_at` already carries the same semantics — adding a second column would be redundant.
- 30 days is long enough to catch any audit need and is safely beyond any plausible deploy lag.
- Rejected rows must outlive any future re-submission by the same or a different player, so the only safe policy is permanent retention.

## Consequences

- `nomination_votes` cascade-deletes when its parent Nomination is deleted (FK `ON DELETE CASCADE`) — vote history on applied Nominations is intentionally discarded.
- `player_profiles` cleanup remains unimplemented; deferred until there is enough usage data to set a meaningful inactivity threshold.

## Amendment (2026-08-16) — the decision is affirmed; what it costs and what it is called both change

A grill re-opened this ADR against `ISSUE-01` §3 (formerly `ISSUE-07`). **Every decision above stands
unchanged.** What follows is the reasoning that was missing, and one piece of vocabulary.

Measured live the same day: **191 rows — 148 `rejected`, 41 `accepted`, 2 `pending`.** All 41 accepted
rows carry a non-null `reviewed_at`, so the apply-then-prune path this ADR describes is demonstrably
working; there is no silent backlog of approved-but-unapplied rows escaping the 30-day sweep.

**1. A `rejected` row does two jobs, and only one of them is retention.** It is both a **Nomination** —
one player's submission, perishable — and a **Refusal**, the permanent verdict on a `(word, direction)`
pair. The original decision above is right *because* the second job exists, but it never named it, which
is why "prune the rejected rows" keeps looking cheap to every session that meets this table. The two
terms are now separated in `CONTEXT.md`.

**2. A separate `rejected_words` set is decided against.** `ISSUE-01` §3 proposed one as the
replacement de-duplication mechanism that pruning would require. It is not needed: nothing about
keeping the row is expensive enough to justify a second table plus the write path that maintains it.
The simpler design is the one already shipped — keep the row, and make looking it up cheap.

**3. The real cost of permanent retention was never storage.** A row is ~200 bytes; a million of them
would not trouble the Free tier. The cost is that `GET /api/nominations/lookup` counts `rejected` and
`accepted` by `(word, direction, status)`, and **`nominations` carries no index those queries can
use** — only the primary key and the partial unique on `(word, direction) WHERE status = 'pending'`.
So every nomination-modal open full-scans the table, and that scan grows in exactly the rows this ADR
declines to delete. A composite `(word, direction, status)` index is the candidate fix; whether it
earns its place is being **measured, not assumed** (`TICKET-14`), and if it ships it rides release-day
runbook step 5, because the migrations folder is frozen until then.

**4. `pending` growth is not a risk this ADR needs to answer.** The partial unique index admits one
pending row per `(word, direction)`, so the queue is bounded by the number of distinct words anyone
proposes, not by submission volume. No review SLA is owed, and none is implied by keeping the rows.

**5. Anonymous INSERT volume is explicitly out of scope here.** It is a platform-wide accepted risk
with its own trigger and its own constraint ranking, recorded in `CONTEXT.md` under *Persistence
decisions → API rate limiting* (it lived in `reflections.md` until 2026-08-17). This ADR governs what happens to rows once they exist, and a rate limit would not change
any of it.

**6. One known live gap in the guardrail this ADR rests on.** The Refusal warning matches on the
normalised form, and one stored row is not normalised: `ιουνιος` (`remove`, rejected 2026-07-15) ends
in a final sigma, so a re-proposal normalises to `ιουνιοσ`, matches nothing, and warns nobody. It is
the only such row in 191 — words have been stored normalised since session 86 — and the blocklist does
not cover it either, because that guard runs on `add` only. Recorded here because it is a hole in this
ADR's own justification, not a bug in the code that reads it; the fix is owned as an open question on
`TICKET-14`.
