# Handoff: Engagement Epic (umbrella)

**Date:** 2026-07-02 (supersedes `nemesisFeature.md`, 2026-06-27 — renamed and generalised)
**Status:** Epic tracker — pillars spawn their own handoffs as they mature
**Goal:** player engagement + competition across the platform

---

## Structure

This epic has one **prerequisite** and several **pillars**. Each pillar graduates to its own handoff when it becomes the active focus; this doc keeps the backlog so nothing is lost.

```
Durable identity  (PREREQUISITE — ✅ DONE 2026-07-03, ADR 0012; handoff deleted)
        │
        ├── achievementsLeksokipos.md   (pillar #1, user's favourite — own handoff)
        ├── Nemesis / taunts            (parked below)
        ├── Weekly leaderboard          (parked below)
        ├── Records / Hall of Fame      (parked below)
        ├── Lifetime stats              (v1 strip ✅ shipped on Profile Page; counters parked)
        └── Streaks                     (parked below, agent-suggested)
```

**Decided:** identity comes first (achievements are worthless if losable). **✅ Satisfied 2026-07-03:** Sign-in Restore / Disconnect / `identity_audit` all shipped; merge semantics live in **ADR 0012** (auth account = anchor, device adopts canonical `device_uuid`, best score per puzzle wins). The identity handoff is deleted — cite ADR 0012.

**Display surface — ✅ SHIPPED 2026-07-03 (Profile Page epic; its handoff `profilePageAndAchievements.md` is retired):** `/profile` is live — identity header, three entry points, a **v1 lifetime-stats strip**, and the **Trophy Case**. The Trophy Case renders the frozen Leksokipos catalog (`src/games/leksokipos/lib/achievements.ts`) and lights earned badges (earned-state wiring shipped with Epics A/B1/B2). The B1/B2 manual prod smoke-check is still pending — see `achievements-future-parked.md`.

---

## Pillar backlog

| Pillar | What it is | Data exists today? | Handoff |
|---|---|---|---|
| Achievements | One-shot + tiered badges (Leksokipos v1) | **✅ SHIPPED** — Epic A one-shots + B1 points tier + B2 pangram tier (`player_achievements`/`player_pangrams`, ADR 0013); toasts + lit Trophy Case live | done — remaining ideas in `achievements-other-ideas.md` (its old handoff `achievementsLeksokipos.md` is retired) |
| Nemesis / taunts | Notification when overtaken on a Leaderboard | No — needs `notifications` table | parked (details below) |
| Weekly leaderboard | Sum of daily scores per week per player | **Yes** — aggregate `game_scores` by `puzzle_date` range | parked |
| Records / Hall of Fame | Highest score ever, most words in a day, etc. | Partially — per-day rows exist, no all-time views | parked |
| Lifetime stats | Pangrams found, Τζιμάνι count, totals per player | **SHIPPED** — `/profile` strip (`GET /api/profile/stats`): total points, puzzles played, Τζιμάνι, pangram count (`player_pangrams`), Πρωτιές (First-Place Count, session 85). **Still parked:** streak display | Profile Page (done); new-capture ideas in `stats-new-capture-ideas.md` |
| Streaks | Consecutive days played — strongest retention mechanic in daily games | Derivable from `game_scores` dates | parked |
| Live head-to-head sessions | Two players agree to start together, race to find most words in a fixed window (e.g. 10 min) | No — needs realtime session/matchmaking state | parked (details below) |
| Friends / private leagues leaderboard | Scope the leaderboard to people you know, not the whole global top 20 | No — needs a friendship/league membership model | parked (details below) |

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

All-time bests: highest daily score, most words found, fastest Τζιμάνι, longest streak. Caution from the achievements grill prep: raw "highest score ever" is distorted — Leksokipos `maxScore` varies per puzzle (soft-capped since session 84, no hard ceiling), so consider records as % of that day's max, or per-game framing. Retention is settled: `game_scores` is append-forever.

### Lifetime stats

Per-player counters: pangrams, words, points, Τζιμάνι count. Heavy overlap with the achievements data model (`player_stats` counters idea in `achievementsLeksokipos.md` question 5) — likely the SAME table; design them together, ship display separately.

### Streaks

Consecutive days with a played puzzle. Derivable from `game_scores` but fragile (missed day = reset — decide on streak-freeze mercy). Pairs naturally with achievements tiers (7/30/100-day badges) and with nemesis ("your rival kept their streak").

### Live head-to-head sessions ("My Idiot Brother" idea)

Two players arrange to join the same timed session and compete live — most words found in a fixed window (e.g. 10 min) wins. Biggest departure from every other pillar here: everything else is async/derived from `game_scores`; this needs actual realtime state (session join, synchronized countdown, live opponent score) — the leaderboard/nemesis investigation explicitly found no realtime infra and no WebSockets today. Open questions: matchmaking (invite link/code vs friends list — depends on identity/friends model not yet built), what happens on disconnect, same puzzle for both players or independent, scoring parity with existing single-player scoring. Likely the most complex pillar; probably sequenced after the async ones prove out the identity/data model.

### Friends / private leagues leaderboard

At scale, global top-20 stops being meaningful to most players — want to see rank among people they actually know. Two shapes floated: (1) friendships (mutual add, like the nemesis recipient model — needs durable identity, already satisfied) or (2) leagues (named groups players create/join/subscribe to, more like a league table than a friend graph). Open questions: friends vs leagues vs both; invite mechanism (link/code, same question as head-to-head sessions above); does this reuse the existing `game_scores` leaderboard query just with a WHERE-clause scope, or need its own table; league retention/membership churn. Cheap if it's "friends" filtering on top of the existing leaderboard poll; more work if leagues need their own membership/admin model.

---

## Sequencing recommendation

1. ~~Durable identity~~ — ✅ DONE 2026-07-03 (ADR 0012)
2. ~~Achievements (Leksokipos v1)~~ — ✅ DONE (Epic A + B1 + B2; leftovers in `achievements-other-ideas.md`)
3. Weekly leaderboard — cheap, visible, competitive
4. Streaks → Records → Nemesis (nemesis last: most moving parts, benefits from all prior data existing)

## Suggested skills

- `/aihelper` — context reload at session start
- `/grill-with-docs` — when activating any parked pillar, grill it and spawn its handoff
- `/to-tickets` + `/tdd` — per pillar once its handoff is ready-for-agent
