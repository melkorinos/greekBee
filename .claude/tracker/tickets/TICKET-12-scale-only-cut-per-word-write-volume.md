# SCALE-ONLY — do not build before ~500 daily players: cut Leksokipos's per-word write volume

**Status:** ready
**Blocked by:** *Operator go-ahead, gated on a measurement.* Do **not** start this ticket until
sustained daily players pass roughly **500**, or Vercel function invocations become a visible line
on the bill. Below that threshold the correct action is to close this file unchanged and walk away —
the current behaviour is fine and the measurements below say so.
**Spec:** this file (the measurement is the spec); constrained by ADR 0003 (server-wins restore)

## Why

Leksokipos writes to the database **twice for every word a player finds**, and the state-sync write
resends the entire found-word list each time. Measured 2026-08-15 from `pg_stat_user_tables`:

| Table | Live rows | Updates | Ratio |
| --- | --- | --- | --- |
| `game_state` | 83 | 29,025 | 350:1 |
| `game_scores` | 536 | 31,562 | 59:1 |

`game_state` holds **only Leksokipos** (verified: `SELECT DISTINCT game_id` returns one row), so both
numbers are essentially one game's traffic. Two independent per-word lanes produce them:

1. **State sync.** [`useGameStateSync`](../../../src/hooks/useGameStateSync.ts) fires on every growth
   of `foundWords` and calls [`pushFoundWords`](../../../src/games/leksokipos/sync.ts#L152), which
   posts `state: { foundWords }` — **the whole array**, every time. Payload is O(n) per word and
   O(n²) per round: forty words means 1+2+…+40 ≈ 820 word-slots sent across 40 requests to persist
   40 words. Gated on `profileLinked`, so only cross-device players pay it today.
2. **Score posting.** [`useScoreSubmission.submit`](../../../src/hooks/useScoreSubmission.ts#L70)
   posts whenever the score strictly increases. Every accepted Leksokipos word increases the score,
   so this is also one POST per word. The `lastPostedRef` guard suppresses duplicates, not frequency.

A third, smaller contributor: the display-name fan-out at
[`src/app/api/profile/route.ts:61`](../../../src/app/api/profile/route.ts#L61) rewrites every
historical score row for a device on each rename (see ISSUE-04).

**This is deliberately not urgent.** Projected at 1,000 daily players averaging 40 words: ~80,000
upserts/day, under 1 write/second averaged, perhaps 10–20/second if play clusters at the daily
puzzle reset. Postgres does not care about that, not even on the free tier's shared-CPU instance —
and autovacuum is currently keeping up easily (same-day `last_autovacuum` on both tables, 23 and 96
dead tuples). What eventually adds up is ~2.4M Vercel edge invocations/month doing work a fraction
as many requests could do. The prize here is roughly a **5–10× efficiency headroom that nobody is
currently paying for** — worth collecting when the volume is real, worth ignoring until then.

## Scope

- [ ] **First, re-measure.** Re-run the `pg_stat_user_tables` query above and confirm the update
      ratios are still growing and the daily-player count justifies the work. If not, stop and leave
      this ticket in place.
- [ ] Add a trailing debounce (**3–5 s**) to the `game_state` push in
      [`useGameStateSync`](../../../src/hooks/useGameStateSync.ts) — coalesce the per-word pushes
      into one write per quiet period.
- [ ] Flush the pending push on `visibilitychange` (hidden) **and** `pagehide`, so a player who
      closes the tab mid-round loses nothing. **This is the whole risk of the ticket** — a dropped
      flush means lost words, which is strictly worse than the extra writes it saves.
- [ ] Keep the existing `profileLinked` gate and the just-linked backfill path intact; neither
      should be debounced away.
- [ ] Extend `src/test/shared/useGameStateSync.test.ts` with fake timers: N rapid word additions
      produce **one** push, and a hide event before the timer fires still pushes.
- [ ] **Leave `useScoreSubmission` alone.** `game_scores` drives the *live* leaderboard, so latency
      there is user-visible in a way state-sync latency is not. Explicitly out of scope.
- [ ] **Do not implement delta posts.** Sending only the new word would kill the O(n²) payload, but
      ADR 0003's server-wins restore rebuilds the round from `foundWords` alone — `pullSnapshot`
      depends on the full array being authoritative. Changing that touches reconciliation, which is
      the part that has historically drifted. Out of scope unless the payload itself is measured to
      be the problem, which it currently is not.
- [ ] Update `.claude/aiHelper/coverageMap.md` for the extended test file.

## Done when

- A round in which the player finds N words in quick succession produces **one** `POST /api/game-state`
  per debounce window instead of N, verified in the test suite with fake timers.
- Closing or backgrounding the tab mid-round still persists every word found — proven by a test that
  fires the hide event before the debounce timer elapses, and by one manual cross-device check
  (find words on phone, background the tab, open on desktop, all words present).
- `npm run test -- --run`, `npx eslint .`, and `npm run build` all pass. `npm run test:e2e` is **not**
  required — this touches a hook, not a page, layout, route, or shared chrome component.

## References

- [`src/hooks/useGameStateSync.ts`](../../../src/hooks/useGameStateSync.ts) — lane 1's trigger.
- [`src/games/leksokipos/sync.ts`](../../../src/games/leksokipos/sync.ts) — `pushFoundWords`, the full-array body, and `pullSnapshot`.
- [`src/hooks/useScoreSubmission.ts`](../../../src/hooks/useScoreSubmission.ts) — lane 2, deliberately untouched.
- ADR 0003 — server-wins restore; why the full array is currently the safe shape.
- ISSUE-04 — the rename fan-out, a third source of `game_scores` updates.
