# Handoff — Offline Lock Feature (READY FOR IMPLEMENTATION)

**Status:** Design complete. Grill session finished 2026-06-29. No code written yet. Pick up at implementation.

---

## Goal

Give Leksokipos players a deliberate way to play offline without losing their score. A toggle activates Offline Lock: navigation and refresh are blocked, scores queue locally, and on unlock the score syncs to the leaderboard.

---

## Settled design (all decisions final)

### What it is

An **Offline Lock** toggle inside the Leksokipos game UI (exact placement deferred — don't cramp the UI; decide during implementation). Available on Daily Puzzles only — hidden on Custom Puzzles.

### While locked

- `beforeunload` blocks browser refresh and tab close
- Shell nav links (game picker, header logo) show a confirmation dialog before routing away
- `useDayChange` redirect is suppressed — replaced by an in-game banner: "Today's puzzle has changed — finish and unlock to sync, then refresh for the new puzzle"
- Every score submission writes to the **Offline Score Outbox** (see below) instead of POSTing directly
- `game_state` pushes (found-words cross-device sync) fail silently as before — self-heal on next word found post-reconnect. Not queued.
- Name saves while locked overwrite `displayName` in the outbox entry

### Offline Score Outbox

Single overwriting localStorage entry — not an append queue. Shape:

```ts
{ gameId: "leksokipos", puzzleDate: string, deviceId: string, score: number, displayName: string }
```

Each new word overwrites the previous entry. `game_scores` upserts by `(device_id, game_id, puzzle_date)` so only the latest score matters.

Flush calls `postScore` directly — **bypasses `useScoreSubmission` hooks entirely** (avoids `lastPostedRef` dedup guard, which is in-memory only and resets on refresh).

### On toggle-off (unlock)

1. Flush outbox via `postScore`
2. If flush fails: keep entry, retry on next toggle-off
3. Clear `beforeunload` handler and Shell nav interception

### On page mount (safety net)

If an outbox entry exists in localStorage on mount, flush it immediately — even if not currently locked. Catches the "forgot to unlock" case.

### No online notification

No passive "you're back online" banner. Flush is manual (toggle-off) only.

---

## Key files to touch

| File | Why |
|------|-----|
| `src/hooks/useScoreSubmission.ts` | Must be bypassed during lock; outbox flush calls `postScore` directly |
| `src/hooks/useGameStateSync.ts` | No changes needed — silent failure while offline is acceptable |
| `src/games/leksokipos/hooks/useDayChange.ts` | Must read `isLocked` and skip `router.replace` while locked; show banner instead |
| `src/lib/postScore.ts` | Flush calls this directly |
| Shell layout / nav links | Must read lock state and show confirmation before routing |

New files expected:
- `src/hooks/useOfflineLock.ts` — lock state, `beforeunload` registration, outbox read/write/flush
- `src/games/leksokipos/hooks/useOfflineScoreOutbox.ts` — or merged into above

---

## Architecture note: lock state sharing

The toggle lives in Leksokipos, but the Shell needs to read it to block its nav links. Options at implementation time:

- **React context** at Shell layout level — Leksokipos writes `setLocked`; Shell reads `isLocked`
- **localStorage flag** + `storage` event — Shell subscribes to `offlineLock` key changes

Both are valid. The context approach is more idiomatic React; the localStorage approach avoids adding a provider to the global layout.

---

## Constraints

- No new npm dependencies (CLAUDE.md standing rule)
- Cold start (closed tab, rebooted phone) is not supported — acknowledged by design (ADR 0010)
- Puzzle rotates at **03:00** (not midnight) — relevant to the day-boundary banner

---

## Docs already written

- `CONTEXT.md` — `Offline Lock` and `Offline Score Outbox` terms minted
- `docs/adr/0010-offline-lock-client-side-no-service-worker.md` — records no-SW decision

---

## Suggested next steps

- `/to-issues` — break into vertical-slice implementation tickets
- `/tdd` — implement with red-green-refactor starting from the outbox flush logic
- `/verify` — confirm offline behaviour with DevTools "Offline" throttling before and after
