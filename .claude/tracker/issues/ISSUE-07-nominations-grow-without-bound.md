# Rejected and pending nominations are never pruned, and anyone can INSERT without a rate limit

**Deferred:** 2026-08-15
**Revisit when:** the public launch opens the nomination form to strangers, or `nominations` passes
~5,000 rows. Today the audience is friends-and-family, which is the only thing holding this down.

## Problem

Two facts combine badly.

**Nothing prunes most of the table.** The nightly cron at
[`src/app/api/cleanup-scores/route.ts:49-52`](../../../src/app/api/cleanup-scores/route.ts#L49-L52)
deletes nominations only when *all three* hold: `status = 'accepted'`, `reviewed_at IS NOT NULL`,
and `reviewed_at` older than `NOMINATION_APPLIED_RETENTION_DAYS` (30). The comment states the intent
plainly — *"Rejected and pending nominations are never deleted."* So `rejected` accumulates forever,
and `pending` accumulates forever if nobody reviews it. Current state: 190 live rows, of which 2 are
pending.

**Anyone can insert.** RLS on `nominations` is a deliberate permissive open-INSERT policy (one of
the 15 `rls_policy_always_true` warnings the project-mcp skill documents as by-design), and the
route applies no rate limit, no captcha, and no per-device quota. `device_id` is a client-supplied
string, so it is trivially spoofable and cannot be used as a throttle key on its own.

The write statistics already show how much churn this table takes relative to its size: 2,911
inserts and 2,363 deletes against 190 live rows. Votes cascade correctly on delete
(`nomination_votes_nomination_id_fkey ... ON DELETE CASCADE`, verified), so vote rows are not an
independent leak — 0 orphaned votes measured.

The exposure is not storage. A nomination row is ~200 bytes; even a million of them is 200 MB, and
an attacker filling the free tier's 500 MB would take a while. The real costs are:

1. **The review queue becomes unusable.** `/leksikastirio` lists pending nominations; a few thousand
   junk entries buries the real ones and there is no bulk-reject.
2. **`word` and `note` are free text written by strangers and rendered in an admin UI.** Volume plus
   arbitrary content is a moderation problem, not just a size one.
3. **The listing GET already scans.** 4,655 sequential scans reading 697,815 tuples at 190 rows —
   fine now, linear in table size later.

## Relationship to the existing accepted risk

`reflections.md` already carries a **"API rate limiting (accepted risk)"** entry covering anon INSERT
spam across all routes, with a stated revisit trigger of ~500 DAU and a 5,000-row `nominations`
tripwire in its monitoring SQL. **This issue does not reopen that decision** — it records the
*nominations-specific* half that the reflection does not cover: the retention asymmetry (rejected and
pending are never pruned regardless of volume) and the moderation-queue consequence, neither of which
a rate limit fixes. Read the reflection first; it holds the measured quota table.

## Why deferred

The audience is currently people the operator knows, so the abuse case is theoretical, and every
real fix needs a decision that has not been made:

- **Rate limiting** needs a throttle key that is not the spoofable `device_id`, which in practice
  means IP-based limiting at the edge (Vercel firewall rules) or a Postgres counter table — a real
  design choice with cost implications on both paths.
- **Pruning rejected nominations** is easy (`status = 'rejected'` with its own retention constant)
  but changes behaviour the current design chose on purpose: keeping rejections is what stops the
  same word being re-nominated and re-reviewed forever. Removing them needs a replacement
  de-duplication mechanism, most likely a small `rejected_words` set that outlives the rows.
- **Pruning stale `pending`** presumes an SLA on review that does not exist yet.

None of these should be guessed at under launch pressure; all three are cheap once the launch shape
and the moderation workflow are settled. Filing this so the exposure is visible rather than
discovered by whoever first points a script at the form.

## References

- [`src/app/api/cleanup-scores/route.ts`](../../../src/app/api/cleanup-scores/route.ts) — the prune, and what it deliberately skips.
- [`src/config/retention.ts`](../../../src/config/retention.ts) — `NOMINATION_APPLIED_RETENTION_DAYS`, and the comment on what is exempt.
- [`src/app/api/nominations/route.ts`](../../../src/app/api/nominations/route.ts) — the open INSERT path.
- `.claude/skills/project-mcp/SKILL.md` — the advisor baseline explaining why the always-true policy is intended.
