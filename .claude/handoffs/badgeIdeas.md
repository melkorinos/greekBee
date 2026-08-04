# Handoff: Parked Badge Ideas

**Date:** 2026-07-30
**Status:** Idea backlog — none of this is committed scope; each item needs its own grill before any build
**Goal:** hold the badge/achievement ideas that keep outliving their containers, until one is promoted

---

## Context

This content has now lived in three places: `badges-parked.md` (deleted 2026-07-18 when its item 5 shipped
as the badge-display slice), then issue `12-badge-ideas-parked.md` (deleted 2026-07-30, this doc replaces it).
It kept getting filed as a tracker issue and never triaged — because it isn't a task, it's a menu. A handoff
is the honest home.

Everything below is built on **ADR 0013** (`player_achievements` immutable fact rows; lanes
A client-live / B deferred-server / C append-only-set). The shipped **pangram tier** is the lane-C reference
implementation — mirror it rather than inventing a new shape. Badge display shipped in session 112
(`glyph` field, Trophy Case, `player_profiles.selected_badge_id`, `LeaderboardBadge` chip,
`FEATURE_FLAGS.achievements` = `true`).

Verified still accurate on 2026-07-30: nothing in this list has shipped since it was written.

## The parked items

### 1. New Τζιμάνι conditions

`leksokipos-tzimani` was freed in session 108 (catalog entry removed; prod already held 0 rows — ADR 0013
records the frozen-id exception). The operator wants the badge re-awarded **under different, less demanding
conditions** than "found all the words". Define those conditions in the grill; the frozen-id rule applies
again the moment it re-ships. The in-game completion mechanic survives (board lock + ΤΟ ΠΕΘΑΝΕΣ,
`allWordsFound`) — only the reward is gone.

### 2. Placement / podium badges ⭐ — agreed next promotion (2026-07-18 grill)

The most build-ready item in this doc. Lifetime 1st/2nd/3rd counts already flow from `/api/profile/stats`
since session 109 (`countPodiumFinishes` — see [route.ts](src/app/api/profile/stats/route.ts) and
[placement.ts](src/lib/placement.ts)), so **tiered** podium badges can ride the same stats read-back as the
points tiers: lane-C-style crossing detection, no new capture, no migration.

A *live* "you finished 1st today" badge is a different and much larger thing — it needs the lane-B deferred
puzzle-close job. Open questions there: where the job runs (Vercel cron route; there are no Supabase edge
functions in this project), what "close" means against puzzle rollover, tie handling, and idempotency
(insert-if-absent, since crons retry).

**If you promote one item from this doc, promote the tiered half of this one.**

### 3. Additional cumulative-stat badges (lane C)

"Reached rank N this many times" etc. — mirror the pangram tier exactly: set-table + insert-if-absent route
+ Restore union + sync lane + thresholds in `achievementTuning.ts`. Open per item: the qualifying event, the
unique-constraint columns (keep the `puzzle_date` dimension so future pivots stay query changes rather than
migrations), and the thresholds.

### 4. Words-by-length badges

Once pickup-03 data accrues — e.g. a tiered "long-word hunter" over the `player_words` counts. Same
stats-read-back crossing pattern as the points and pangram tiers. The capture lane already exists
(session 110: `player_words`, `POST /api/words`, `WordsByLengthCard`).

### 5. Pangram tier threshold balance pass — blocked

`pangramTierThresholds` (10/20/50 in [achievementTuning.ts](src/config/achievementTuning.ts)) were
placeholders. Re-tune once real pangram-rate data exists — **that data does not exist yet, so this is
blocked, not merely parked.** When unblocked it's a tuning/query edit only, no migration.

### 6. Badge display follow-ups

Deliberately cut from the shipped 2026-07-18 slice: multiple displayed badges + precedence rules, custom
icon art (emoji glyphs are interim — operator: "will improve later"), and badge earning outside Leksokipos.

## Recommended next step

Promote **item 2 (tiered podium badges)** when there's appetite — it's the only item with its data already
in place and a proven pattern to copy. Grill it into a scoped slice first; do not build straight from this
doc, and do not promote more than one item at a time.

Items 1, 3, 4 and 6 stay parked. Item 5 stays blocked until pangram-rate data exists.

## Suggested skills

- `/grill-with-docs` — pin the conditions/thresholds for whichever item gets promoted, and update the domain
  docs inline. Required before any build; every item here is under-specified by design.
- `/to-tickets` — break the grilled result into vertical-slice tickets.
- `/tdd` — build the slice red-green-refactor, mirroring the pangram tier lane.

## Related

- **ADR 0013** — `player_achievements`, the three lanes, the frozen-id rule
- The old item 5 pointed at issue `11-pangram-tier-prod-smoke-check.md` for a pending human toast/chip
  check — that issue no longer exists as of 2026-07-30, so treat the smoke check as done or re-verify it.
- `.claude/aiHelper/log.md` sessions 66, 69, 107–113 — the achievements build history
