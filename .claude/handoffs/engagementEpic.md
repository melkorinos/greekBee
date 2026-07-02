# Handoff: Engagement Epic (umbrella)

**Date:** 2026-07-02 (supersedes `nemesisFeature.md`, 2026-06-27 — renamed and generalised)
**Status:** Epic tracker — pillars spawn their own handoffs as they mature
**Goal:** player engagement + competition across the platform

---

## Structure

This epic has one **prerequisite** and several **pillars**. Each pillar graduates to its own handoff when it becomes the active focus; this doc keeps the backlog so nothing is lost.

```
googleLoginIdentity.md  (PREREQUISITE — durable identity; all cross-day stats key on it)
        │
        ├── achievementsLeksokipos.md   (pillar #1, user's favourite — own handoff)
        ├── Nemesis / taunts            (parked below)
        ├── Weekly leaderboard          (parked below)
        ├── Records / Hall of Fame      (parked below)
        ├── Lifetime stats              (parked below)
        └── Streaks                     (parked below, agent-suggested)
```

**Decided:** identity comes first (achievements are worthless if losable). Everything below waits for the merge-semantics decision in `googleLoginIdentity.md`.

---

## Pillar backlog

| Pillar | What it is | Data exists today? | Handoff |
|---|---|---|---|
| Achievements | One-shot + tiered badges (Leksokipos v1) | Partially (`is_perfect`; pangrams NOT captured) | `achievementsLeksokipos.md` |
| Nemesis / taunts | Notification when overtaken on a Leaderboard | No — needs `notifications` table | parked (details below) |
| Weekly leaderboard | Sum of daily scores per week per player | **Yes** — aggregate `game_scores` by `puzzle_date` range | parked |
| Records / Hall of Fame | Highest score ever, most words in a day, etc. | Partially — per-day rows exist, no all-time views | parked |
| Lifetime stats | Pangrams found, Τζιμάνι count, totals per player | No — pangrams never posted; Τζιμάνι backfillable from `is_perfect` | parked (overlaps achievements counters) |
| Streaks | Consecutive days played — strongest retention mechanic in daily games | Derivable from `game_scores` dates | parked |

---

## Parked pillar notes

### Nemesis / taunts (from the original 2026-06-27 exploration)

Lightweight one-directional competitive messaging — NOT chat. Fire when a player is overtaken; goal is "come back and fight."

Investigation findings (verified 2026-06-27, spot-checked 2026-07-02):
- Leaderboard: top 20 per game per day, polled every 5 min (`src/app/api/game-scores/route.ts`, `src/hooks/useLeaderboard.ts`). No realtime anywhere; no notifications table; no email provider.
- Agreed delivery: new `notifications` table, polled on app open (same pattern as leaderboard). No WebSockets, no new deps. Email rejected as too complex.

Recommended shape (unvalidated):
```
notifications: id, recipient_player_id, sender_player_id,
               game_type, message_template, created_at, read_at
Passing detection: server-side (Postgres trigger or in the score POST path) —
                   client-side misses events when the tab is closed.
```

Open questions: player-initiated vs automatic; fixed templates vs composed messages; which games first; read/unread persistence. Identity note: `recipient_player_id` must be the durable identity from the prerequisite handoff, or taunts strand on one device.

### Weekly leaderboard

Pure aggregation — `SUM(score) GROUP BY player, week` over `game_scores`. Open questions: week boundary (Mon–Sun Greek convention?), per-game vs cross-game, does it need its own API route + pill in the existing LeaderboardModal day strip, retention (current window is 7-day rolling — weekly boards imply keeping rows longer or materialising weekly summaries before cleanup). Cheapest pillar to ship; a good identity-era warm-up.

### Records / Hall of Fame

All-time bests: highest daily score, most words found, fastest Τζιμάνι, longest streak. Caution from the achievements grill prep: raw "highest score ever" is distorted — Leksokipos `maxScore` varies per puzzle (capped 600), so consider records as % of that day's max, or per-game framing. Needs retention decision (same as weekly).

### Lifetime stats

Per-player counters: pangrams, words, points, Τζιμάνι count. Heavy overlap with the achievements data model (`player_stats` counters idea in `achievementsLeksokipos.md` question 5) — likely the SAME table; design them together, ship display separately.

### Streaks

Consecutive days with a played puzzle. Derivable from `game_scores` but fragile (missed day = reset — decide on streak-freeze mercy). Pairs naturally with achievements tiers (7/30/100-day badges) and with nemesis ("your rival kept their streak").

---

## Sequencing recommendation

1. `googleLoginIdentity.md` — unblocks everything
2. `achievementsLeksokipos.md` — favourite; its data model (counters) should be designed with Lifetime stats in mind
3. Weekly leaderboard — cheap, visible, competitive
4. Streaks → Records → Nemesis (nemesis last: most moving parts, benefits from all prior data existing)

## Suggested skills

- `/aihelper` — context reload at session start
- `/grill-with-docs` — when activating any parked pillar, grill it and spawn its handoff
- `/to-prd` — if the epic needs a single consolidated PRD for the tracker instead
- `/to-issues` + `/tdd` — per pillar once its handoff is ready-for-agent
