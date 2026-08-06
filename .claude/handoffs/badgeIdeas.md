# Handoff: Parked Badge Ideas

**Date:** 2026-08-06 (was 2026-07-30)
**Status:** Idea backlog — none of this is committed scope; each item needs its own grill before any build
**Goal:** hold the badge/achievement ideas that keep outliving their containers, until one is promoted

---

## Context

This content has now lived in three places: `badges-parked.md` (deleted 2026-07-18 when its item 5 shipped
as the badge-display slice), then issue `12-badge-ideas-parked.md` (deleted 2026-07-30, this doc replaces it).
It kept getting filed as a tracker issue and never triaged — because it isn't a task, it's a menu. A handoff
is the honest home.

Everything below is built on **ADR 0013** (`player_achievements` immutable fact rows; lanes
A client-live / B deferred-server / C append-only-set). Badge display shipped in session 112
(`glyph` field, Trophy Case, `player_profiles.selected_badge_id`, `LeaderboardBadge` chip,
`FEATURE_FLAGS.achievements` = `true`).

**Read the ADR 0013 amendment dated 2026-08-06 before touching anything here.** It rebuilt the catalog and
closed or resolved half of this document; the surviving items are re-scoped against it below.

## What the 2026-08-06 grill settled

Ticket `08-podium-badges-tiers-and-thresholds.md` was folded into this doc and deleted. It asked which podium
tiers and thresholds to build; the answer was **no podium badge**, and the follow-on catalog review then
settled far more than the ticket scoped. Full reasoning is in the ADR — the short version:

- **Podium badges rejected**, and the podium lane is deleted with them (see Removal slice below).
- **`player_milestones`** replaces `player_pangrams` + `player_words` and adds the two new counters.
- **Στην Κορυφή** → tiered 1/10/25. **Θεριστής** → renamed **Τζιμάνι**, tiered 1/5/10, ratio still 80%.
- **Πρώτα Βήματα removed** permanently; **`leksokipos-tzimani` revived**. Both licensed only by the
  pre-launch data wipe — that window shuts at launch.
- **Three tier rungs**, Μακρυλέξης keeps its fourth as the standing exception.
- **One displayed badge, permanently** — no precedence system will ever be built.
- **Emoji glyphs retired** in favour of drawn SVG marks → `.claude/handoffs/badgeVisualSystem.md`.

## The parked items

### 1. New Τζιμάνι conditions — ✅ RESOLVED 2026-08-06

Τζιμάνι returns as the tiered 80%-of-words badge, reviving the freed `leksokipos-tzimani` id. This item asked
for exactly that: the badge re-awarded under less demanding conditions than "found all the words". Specified
in ADR 0013 §3–4; nothing further to decide. Kept here only so the resolution is visible where the question
was asked.

### 2. Placement / podium badges — ❌ REJECTED 2026-08-06

Was the recommended promotion; it did not survive contact. **Podium slots are fixed at three while the
audience grows**, so any "finished top-N" badge gets strictly harder over time — no threshold fixes a metric
problem. A percentile metric is audience-proof but backfires at current scale. Rationale, the measured data,
and the deleted lane are all in the ADR. **Do not re-promote this** without a new argument about the metric,
not the thresholds.

### 3. Additional cumulative-stat badges (lane C) — still parked, now cheaper

"Reached rank N this many times" etc. **`player_milestones` is the home for these now** — a new cumulative
badge is a new `kind` value, not a new table, so the migration cost this item used to carry is gone. Still
open per item: the qualifying event, the `kind` string, and the thresholds. Note the ADR's `NULLS NOT
DISTINCT` trap if the new kind has no `detail`.

### 4. Words-by-length badges — still parked

A tiered "long-word hunter" over the `player_words` counts. Same crossing pattern as the other tiers. Note
the capture moved: `player_words` is absorbed into `player_milestones` as `kind='word'`, so this item now
counts rows there.

### 5. Pangram tier threshold balance pass — still blocked

`pangramTierThresholds` (10/20/50 in [achievementTuning.ts](../../src/config/achievementTuning.ts)) were
placeholders. Re-tune once real pangram-rate data exists — **that data does not exist yet, so this is
blocked, not merely parked.** When unblocked it's a tuning edit only, no migration. A longer-than-three
ladder was considered on 2026-08-06 and deferred, so this stays a three-number edit.

### 6. Badge display follow-ups — split three ways

- **Multiple displayed badges + precedence rules — ❌ CLOSED.** One badge, permanently. Not deferred, decided.
- **Custom icon art — ✅ PROMOTED** to `.claude/handoffs/badgeVisualSystem.md`.
- **Badge earning outside Leksokipos — still parked.** Leksokipos-only at launch, and the Profile page must
  say so (see below).

## Owed build work

Decided on 2026-08-06, specified, **not built**. None of it is on the launch path unless the launch
checklist puts it there.

1. **Removal slice — podium lane.** Delete the Βάθρο cell (`LifetimeStatsStrip`), the three
   `leksokipos_*_place_count` fields and the cross-device query in `/api/profile/stats`,
   `src/lib/placement.ts`, their tests, and the **Podium Finish** + **Podium Counts** terms in `CONTEXT.md`.
   Retires a known scaling risk — that query fetches every device's Leksokipos rows.
2. **`player_milestones` migration** + the absorption of `player_pangrams` and `player_words`. Watch the
   `NULLS NOT DISTINCT` trap.
3. **Catalog rebuild** — remove Πρώτα Βήματα, tier Στην Κορυφή and Τζιμάνι, wire both to the new counters.
4. **Profile page scoping** — a labelled Leksokipos section holding the Trophy Case and Λέξεις ανά μήκος, so
   it is unambiguous that badges are Leksokipos-only. A **section, not tabs** — tabs when a second game earns.
5. **Pre-launch data wipe** — deferred, operator-owned, but items 3 and 4 of the ADR's frozen-id exceptions
   depend on it happening before release.

## Suggested skills

- `/to-tickets` — break the owed build work into vertical slices. Item 1 (removal) is independent of the
  rest and can go first.
- `/tdd` — build each slice red-green-refactor.
- `/grill-with-docs` — only for items 3 and 4 above, which are still under-specified by design.

## Related

- **ADR 0013** — `player_achievements`, the three lanes, the frozen-id rule, and the 2026-08-06 amendment
  that supersedes most of this doc
- `.claude/handoffs/badgeVisualSystem.md` — the promoted icon-art work
- `.claude/aiHelper/log.md` sessions 66, 69, 107–113 — the achievements build history
