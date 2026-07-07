# Handoff (parked): Profile stats needing NEW data capture

**Date:** 2026-07-07
**Status:** ⚪ **Parked — spec only.** Deferred from the Profile-stats expansion. No build until each is promoted individually and grilled.

## Context — why these are parked separately

The Profile-stats expansion settled on: **expand Profile in place (option b)** — grow the existing Profile sections, no new route — ship only what already has data, spec the rest. What shipped: a **Πανγκράμ** cell on `LifetimeStatsStrip` (`pangram_count` already flowed from `/api/profile/stats`). Pure display, zero new plumbing. CONTEXT.md "Lifetime Stats" lists it.

**Surface decisions carried forward** (from the now-deleted `achievements-stats-page.md`, itself promoted from `achievements-future-parked.md`):
- **A dedicated `/stats` route (option c) stays deferred** until stats content *genuinely overflows* the Profile Page. A separate page showing the same widgets, bigger, is pure duplication — that's still option (b). Only promote (c) when there's per-game breakdown / history / distribution content that Profile can't hold.
- **Charts trigger the `dataviz` skill** — if any of the ideas below add data-viz (rank-over-time, per-length distribution, score histograms), load `dataviz` *first* (theme-aware, light/dark, semantic-token palette). No new chart library without approval (dependency rule).
- **Prefer a query/view over a new table** for any aggregate; a new `player_*` table is a real scope escalation — grill it, don't reach for it.
- The base achievements work these sit on: **Epic A + ADR 0013** (`player_achievements` fact rows, `player_pangrams` lane C). Cross-check CONTEXT.md's Profile Page / Trophy Case / Lifetime Stats / Streak entries when promoting so nothing duplicates documented surfaces.

The three ideas below all **need data we do not store today.** `game_scores` holds exactly one row per game/device/day (`score`, `is_perfect`) — no per-word, no per-submission, no placement data. Each idea therefore needs its own capture lane + likely a new table. That exits the "display over already-earned data" fence, so each gets grilled + PRD'd on its own before any build. **The model to copy is `player_pangrams`** (ADR 0013 lane C): append-only find-set, one row per fact, progress = `COUNT(*)` never a counter, open RLS, append-forever, unioned on Sign-in Restore (`planPangramMerge`).

---

## 1. Words found, bucketed by length (4, 5, 6 … 14+)

**Data today:** none. `game_scores.score` is an aggregate; individual found words are never persisted except pangrams.

**Capture design (to grill):**
- Precedent already exists — `player_pangrams` stores the *pangram words* a device found per date. A parallel **`player_words`** (`device_uuid`, `puzzle_date`, `word`, length derivable) append-only find-set would give per-length counts via `GROUP BY length` — **and could subsume `player_pangrams`** (a pangram is just a 7-letter-using word), though that's a bigger migration; keep them separate unless grill says otherwise.
- Insert-if-absent on each valid Leksokipos find, same open-RLS/append-forever/merge-on-restore semantics as pangrams.
- **Cost flag:** this multiplies write volume (one row per *word found*, not per puzzle). Confirm that's acceptable vs. the append-forever storage rule before building.

**Open questions:** max bucket — cap at 14+ or read the longest word in `words-el.json`? Cross-game or Leksokipos-only? Backfill impossible (historical words are gone) — new-player-from-here only; state that in the empty-state.

---

## 2. Longest consecutive correct / wrong submissions

**⚠️ Two different meanings — separate them before building:**

- **Consecutive calendar days played** (platform "Streak") — **already a defined domain concept** (CONTEXT.md "Streak": distinct `puzzle_date`s in `game_scores`, platform-wide). This is **derivable from existing data — no capture needed.** If this is what's wanted, it's a *display* task like pangrams, not a new lane. Cheapest win of the three.
- **Longest run of correct/wrong *submissions* within play** — this is what "consecutive correct/wrong submissions" literally means, and it **needs new capture.** Individual guess outcomes are never stored. Requires a submission-event lane or a running max persisted per device. A "best wrong streak" is adversarial/novelty — confirm it's actually wanted before capturing failure data.

**Decide first which of the two you mean.** If it's day-streak, promote it *now* as a display slice (near-free). If it's submission-run, it's a real capture lane and belongs with #1/#3.

---

## 3. Times finished 1st / 2nd / 3rd on the leaderboard

**Data today:** none. Leaderboard rank is computed live for display; final placement is never snapshotted.

**Capture design (to grill):**
- Needs a **placement snapshot at leaderboard-close** (per game, per `puzzle_date`): record the device's final rank once the daily board settles. New lane `player_placements` (`device_uuid`, `game_id`, `puzzle_date`, `rank`), count 1st/2nd/3rd via filter.
- **Hard design question:** *when* does a daily leaderboard "close"? Rank keeps changing as late players post. Options: snapshot at next-puzzle rollover, or compute-on-read from historical `game_scores` (rank = position by score for that date — no new table, but recomputes every view). The compute-on-read route may make this a **display** task too — investigate before assuming a table.

**Open question:** top-3 only, or full rank distribution? Ties?

---

## When promoting any of these
Promote one at a time. `/grill-with-docs` first (cross-check CONTEXT.md Lifetime Stats / Streak / leaderboard entries so nothing duplicates), settle the capture-vs-derive question **before** `/tdd`. If the answer is "derivable from `game_scores`" (likely for #2-days and possibly #3), it collapses back to a display slice — no table, no ADR.
