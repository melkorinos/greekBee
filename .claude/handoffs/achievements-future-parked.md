# Handoff (parked): Achievements — future ideas (placement, extra stats, stats page)

**Date:** 2026-07-06 (split out of the old `achievementsEpicB-deferred.md`)
**Status:** ⚪ **Parked — not committed scope.** No grill, no build until promoted. Captured so the patterns aren't lost. Promote an item to its own real handoff when it's actually wanted.

**Built on Epic A + ADR 0013.** The store (`player_achievements` immutable fact rows) and the three detection **lanes** already exist and are designed to absorb everything below without a rewrite.

---

## Parked ideas

### 1. Placement / relative badges (ADR 0013 **Lane B**)
Awards that depend on a value **not final at end-of-game** — e.g. leaderboard **placement** (1st / 2nd / 3rd). Pattern (already designed, not built): a **deferred server-side job at puzzle-close** reads the final leaderboard and inserts the same `player_achievements` fact rows. **No schema change** — same table, same ids. Since `game_scores` is append-forever (issue 03 fixed), the job no longer races a prune; the leaderboard source stays intact indefinitely. Not in the current catalog — adding the ids is non-breaking (frozen-id rule, ADR 0013).

### 2. Additional cumulative stats / badges
E.g. "reached rank N this many times." Same **Lane C** append-only-set pattern as the pangram tier: a set of qualifying `puzzle_date`s, count = set size, write the fact row on threshold crossing. Any new *id* needs no migration; any new *progress set* needs its own small table (mirror the pangram-tier work in B2).

### 3. Richer inline Leaderboard badges
Beyond the existing 🏛️ Τζιμάνι glyph — more inline `Badge` glyphs on leaderboard rows (CONTEXT.md: a Badge is the visual token; the inline-glyph form is the precedent). Pure display over already-earned ids.

### 4. Dedicated stats page
A standalone stats surface (floated during earlier design). The Profile Page already hosts Lifetime Stats + Trophy Case; decide whether a separate page earns its keep before building.

## When promoting one of these
Write a fresh handoff (mirror B1/B2 structure), list its open design questions, and run `/grill-with-docs` before `/tdd`. Confirm which detection lane (A client-live / B deferred-server / C append-only-set) it uses — ADR 0013 verified all the above are expressible in the existing lanes.
