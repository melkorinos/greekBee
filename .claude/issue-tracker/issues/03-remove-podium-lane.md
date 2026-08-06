# Remove the podium lane — badge rejected, and the query behind it is a scaling risk

Status: ready-for-agent

**Order:** first of three. Independent of tickets 04 and 05 — nothing blocks it, and it blocks nothing.
**Spec:** [`.claude/handoffs/badgeIdeas.md`](../../handoffs/badgeIdeas.md) · ADR 0013 amendment 2026-08-06 §1

## Why

Tiered podium badges do not ship. **Podium slots are fixed at three while the audience grows**, so any
"finished top-N" badge gets strictly harder over time — first place worst, top-three the same failure three
times slower. That is a metric problem, not a threshold problem, so no tuning fixes it. A percentile metric
is audience-proof but was rejected too: at 8 players a day the top 10% is one player, harsher than first
place.

With no badge consuming it, the whole lane goes rather than leaving a paid query feeding a deleted cell.
**The podium query is the one part of `/api/profile/stats` that fetches every device's Leksokipos rows** —
its own comment flags it as the piece to re-engineer before scale. Deleting it retires that risk outright.

## Scope

- [ ] Delete the **Βάθρο** cell from `LifetimeStatsStrip`.
- [ ] Delete the three `leksokipos_first_place_count` / `_second_` / `_third_` response fields **and the
      cross-device query** from [`src/app/api/profile/stats/route.ts`](../../../src/app/api/profile/stats/route.ts)
      (the third element of the `Promise.all`, plus its error branch and the `countPodiumFinishes` call).
- [ ] Delete [`src/lib/placement.ts`](../../../src/lib/placement.ts) (`countPodiumFinishes`,
      `countFirstPlaceFinishes`, `PlacementRow`) and its tests.
- [ ] Remove the **Podium Finish** and **Podium Counts** glossary terms from `CONTEXT.md`.
- [ ] Update the route's header comment — the "Caching / scale" paragraph is entirely about the query being
      deleted, and the remaining route is two device-scoped queries.
- [ ] Update `.claude/aiHelper/coverageMap.md` for the removed test file.

## Notes for whoever builds it

- The reserved `leksokipos-first-place-*` achievement id prefix is **released unused** — no row ever carried
  it, so there is nothing to clean up in `player_achievements`.
- Check for consumers of the three response fields beyond `LifetimeStatsStrip` before deleting them
  (`src/games/leksokipos/sync.ts` types, any profile test fixtures).
- ADR 0013's amendment already records this decision. This ticket carries the **`CONTEXT.md` glossary
  removals**; no new ADR amendment is owed.

## Done when

`npm run test -- --run`, `npx eslint .`, and `npm run build` all pass, plus `npm run test:e2e` (this touches
the profile page). No reference to `placement`, `countPodiumFinishes`, or `*_place_count` survives anywhere
in `src/` or `CONTEXT.md`.
