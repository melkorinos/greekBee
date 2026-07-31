# Podium badges: which tiers, which thresholds, and live-or-lifetime?

**Parent:** [MAP — Public launch readiness](00-MAP-public-launch-readiness.md)
**Label:** `wayfinder:grilling`
**Status:** ready-for-agent
**Assignee:** _(unclaimed)_
**Blocked by:** [Launch checklist](01-launch-checklist-what-does-launch-actually-require.md)

## Question

Scope the **tiered** podium badge into a buildable slice: which placements count, what the
thresholds are, and confirm the lifetime-tier scope against the live-daily one.

This is item 2 of `.claude/handoffs/badgeIdeas.md`, and the handoff is unambiguous that it is
the one to promote: *"If you promote one item from this doc, promote the tiered half of this
one."* It is the only parked badge idea whose data is already in place.

**The reason it is cheap.** Lifetime 1st/2nd/3rd counts already flow from
`/api/profile/stats` since session 109 (`countPodiumFinishes` — see
[route.ts](src/app/api/profile/stats/route.ts) and [placement.ts](src/lib/placement.ts)). So
tiered podium badges ride the same **stats read-back / lane-C crossing detection** as the
existing points tiers: **no new capture, no migration.** Mirror the shipped pangram tier
exactly rather than inventing a shape.

**The trap to keep out.** A *live* "you finished 1st today" badge is a different and much
larger thing — it needs the lane-B deferred puzzle-close job, which does not exist. Its open
questions (where the cron runs — a Vercel cron route, since this project has no Supabase edge
functions; what "close" means against the 03:00 puzzle rollover; tie handling; idempotency on
cron retry) are **not** in this ticket. If the grill drifts there, rule it out of scope on the
map rather than absorbing it.

### To decide

- Which placements earn a badge — 1st only, or all three podium places?
- Thresholds per tier, into `src/config/achievementTuning.ts` (never hardcoded elsewhere)
- Badge ids, Greek names, and `glyph` emoji — noting the **frozen-id rule** in ADR 0013: an id
  is frozen the moment it ships, so name them deliberately now
- Whether ties count, given how `countPodiumFinishes` already resolves them
- Whether these are Leksokipos-only or platform-wide (badge earning outside Leksokipos is a
  parked item 6, so the default is Leksokipos-only)

**Why it is blocked:** retention polish only reaches the launch path if the checklist says so.
If the checklist rules it post-launch, this ticket does not disappear — it moves off the map
as out of scope, and gets picked up after release.

Do **not** build straight from the handoff, and do **not** promote a second badge item
alongside this one — the handoff explicitly forbids both.
