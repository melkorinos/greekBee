# Handoff (parked): Achievements — Dedicated stats page

**Date:** 2026-07-07 (promoted out of `achievements-future-parked.md`)
**Status:** ⚪ **Parked — not committed scope.** No grill, no build until promoted to a real handoff. Captured so the design questions aren't lost.

**Built on Epic A + ADR 0013.** Reads already-earned data (`player_achievements` fact rows, `/api/profile/stats` lifetime stats). This is a **display/surface** idea — no new detection lane, no schema change.

---

## The idea

A standalone stats surface (floated during earlier design). A dedicated page that aggregates a player's lifetime numbers, tiers, and trophies in one place.

## The core tension (answer this before building)

**The Profile Page already hosts Lifetime Stats + Trophy Case.** So the whole question is: **does a separate page earn its keep, or is it a second home for data that already has one?** Options on the table:

- **(a) Do nothing** — Profile Page is enough; kill the idea.
- **(b) Expand in place** — grow the Profile Page's stats/trophy sections instead of adding a route.
- **(c) New `/stats` route** — a richer, dedicated surface (per-game breakdowns, history, charts) that the Profile Page summary links into.

Don't build (c) until there's stats content that genuinely overflows the Profile Page. A dedicated page with the same three widgets is pure duplication.

## Open design questions

1. **What does it show that Profile doesn't?** Per-game breakdown? Time-series / streak history? Rank distribution? If the answer is "the same widgets, bigger," it's option (b), not (c).
2. **Charts?** If any data-viz enters (rank-over-time, per-game score distribution), load the `dataviz` skill first — theme-aware, light/dark, semantic-token palette. No new chart lib without approval (dependency rule).
3. **Navigation / entry point** — where does it live in the nav, and how does the Profile Page summary link into it?
4. **Data source** — everything should come from existing reads (`/api/profile/stats`, `player_achievements`). If a new aggregate is needed, prefer a query/view over a new table. Flag if any write-side work sneaks in (it shouldn't).
5. **Empty / new-player state** — what a player with zero history sees.

## What it does NOT need

No new detection lane (A/B/C), no `player_*` table, no migration, no achievement ids. This is display over already-earned data. If a build ends up adding a table, that's a signal the scope quietly grew — stop and re-confirm.

## When promoting
Write a fresh handoff (or extend this one), answer the (a)/(b)/(c) tension **first**, list the open questions above as decisions, run `/grill-with-docs` before `/tdd`. Cross-check against CONTEXT.md's Profile Page / Trophy Case entries so this doesn't duplicate what's documented there.
