# Handoff: Nemesis Feature

**Date:** 2026-06-27  
**Status:** Exploration only — nothing implemented yet  
**Next session focus:** Design decisions → then implementation plan

---

## What was discussed

The user wants a "competitive taunting" feature to encourage rivalry between players on the leaderboard. The core idea:

- When a player is overtaken on a leaderboard, they receive a taunt/notification
- This is **not** a full chat system — it is lightweight, one-directional competitive messaging
- Primary goal: encourage players to return and fight back

---

## Key findings from investigation

### Leaderboard
- **20 players** shown per game, polled every 5 minutes (`src/app/api/game-scores/route.ts:142`)
- Hook: `src/hooks/useLeaderboard.ts` (polls on visibility change + 5-min interval)
- No real-time subscriptions anywhere in the codebase

### Auth / identity
- Google OAuth via Supabase Auth
- Fields: `id` (UUID), `email`, `user_metadata.full_name`
- Device identity: `player_profiles` table (device_uuid + display_name)
- Auth links device → auth user via `POST /api/auth/link`

### Existing infrastructure
- **No** notifications table
- **No** Supabase Realtime channels — everything is polling
- **No** email provider wired up

### DB tables (relevant ones)
- `game_scores` — scores for all games
- `player_profiles` — display names, device UUIDs
- No messaging or notification tables exist yet

---

## Design questions not yet answered

1. **Player-initiated or automatic?**  
   Does the overtaking player choose to send a taunt (compose UI on leaderboard), or does it fire automatically when someone is passed?

2. **Delivery mechanism** — agreed the lowest-friction path is:
   - New `notifications` table
   - Polled on app open (same pattern as leaderboard hook)
   - No real-time WebSocket needed, no new dependencies  
   *(Email was deemed too complex for now)*

3. **Taunt content** — fixed templates ("Dimitris just passed you!") or player-composed messages?

4. **Passing detection** — client-side (compare rank before/after poll) or server-side (Postgres trigger on `game_scores` insert)?  
   Server-side is accurate; client-side is simpler but misses events when tab is closed.

5. **Scope** — which games first? All three (Leksokipos, Leksindeseis, Leksiarxeio)?

6. **Read/unread state** — does the notification disappear after seen, or persist as history?

---

## Recommended approach (to validate with user)

```
notifications table
  id, recipient_player_id, sender_player_id,
  game_type, message_template, created_at, read_at

Trigger: server-side Postgres function on game_scores insert
  → if new score beats an existing player's score in same game
  → insert notification row

Client: poll on app open (extend useLeaderboard pattern)
  → badge/alert shown on leaderboard button or home screen
```

No new npm dependencies. No Supabase Realtime. Fits existing architecture.

---

## Suggested skills for next session

- `/grill-me` — stress-test the design decisions above (esp. passing detection and taunt authorship) before writing any code
- `/triage` — create a tracked issue once design is settled
- `/to-issues` — break the agreed design into vertical implementation slices
- `/tdd` — implement with red-green-refactor once issues are ready

---

## Files to read at session start

Per `CLAUDE.md`, always read these first:
1. `.claude/aiHelper/soul.md`
2. `.claude/aiHelper/memory.md`
3. `.claude/aiHelper/goals.md`
4. `.claude/aiHelper/reflections.md`
5. `.claude/aiHelper/log.md`

Then read this file and resume from "Design questions not yet answered."
