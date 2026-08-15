# Renames arriving outside /api/profile never reach game_scores, so leaderboards show old names

**Deferred:** 2026-08-15
**Revisit when:** before the public launch — a leaderboard is the most-seen surface in the app, and
a player who renames and still sees the old name will read it as the rename having failed.

## Problem

`game_scores` carries a **denormalised `display_name` on every row**, and the leaderboard GET reads
it from there — it never joins `player_profiles` (see the comment at
[`src/app/api/profile/route.ts:57`](../../../src/app/api/profile/route.ts#L57)). Keeping the copy
fresh is therefore a fan-out `UPDATE` over all of the device's score rows, and that fan-out exists
in exactly **one** place: [`src/app/api/profile/route.ts:61`](../../../src/app/api/profile/route.ts#L61).

Every other write path that can set a name skips it:

- [`src/app/api/auth/link/route.ts`](../../../src/app/api/auth/link/route.ts) pre-populates
  `display_name` from the verified Google identity when the player has none set, and upserts the
  profile directly.
- [`src/app/api/profile/badge/route.ts:76`](../../../src/app/api/profile/badge/route.ts#L76) inserts
  a profile row with the default name.
- [`src/app/api/transfer/claim/route.ts`](../../../src/app/api/transfer/claim/route.ts) reads the
  profile name for the claiming device but rewrites nothing.

Measured live on 2026-08-15:

```sql
SELECT count(*) FROM game_scores s JOIN player_profiles p ON p.device_uuid = s.device_id
WHERE s.display_name IS DISTINCT FROM p.display_name;
-- 118 rows, across 8 distinct devices
```

118 of the 536 score rows (**22%**) carry a name that disagrees with the profile. None of them are
stuck on the `Ανώνυμος` default, so these are all real renames that silently failed to propagate.
8 of 47 profiles are affected — at 43 active devices that is roughly one player in five.

Note the fan-out is also a write-amplifier: one rename rewrites every historical score row for that
device, which is part of the 31,562 updates counted against 536 live rows in
[`TICKET-12`](../tickets/TICKET-12-scale-only-cut-per-word-write-volume.md).

## Why deferred

The cheap fix (call the same fan-out from the other three routes) spreads a known-fragile pattern to
three more call sites, and a fourth path added later will reintroduce the bug. The structural fix —
**drop the denormalised column and resolve names at read time** — is the better answer and is nearly
free here, because the leaderboard GET *already* does a batched `player_profiles` lookup for display
badges in `resolveBadges()`
([`src/app/api/game-scores/route.ts:236`](../../../src/app/api/game-scores/route.ts#L236)). That
query selects `device_uuid, selected_badge_id`; adding `display_name` to the same `in()` makes the
stored copy redundant at zero extra round-trips.

That change touches the leaderboard response shape and the offline outbox (which also carries
`displayName`), so it wants doing deliberately rather than as a hotfix. It pairs naturally with the
`is_perfect` / `data` column cleanup in ISSUE-05 — one migration, one pass over the route.

## References

- [`src/app/api/game-scores/route.ts`](../../../src/app/api/game-scores/route.ts) — the leaderboard GET and `resolveBadges()`.
- [`src/lib/offlineOutbox.ts`](../../../src/lib/offlineOutbox.ts) — queued scores also carry a name.
- ISSUE-05 — the other `game_scores` schema cleanup; do both in one migration.
- [`TICKET-12`](../tickets/TICKET-12-scale-only-cut-per-word-write-volume.md) — the rename fan-out contributes to the update volume counted there.
