# ADR 0010 — Offline Lock: client-side navigation block, no service worker

Deliberate offline play for Leksokipos is implemented as a client-side **Offline Lock** rather than a service worker or installable PWA. When the player activates the lock, browser refresh and in-app navigation are blocked, `useDayChange` redirects are suppressed, and score submissions are queued to a localStorage **Offline Score Outbox** instead of posted directly. The lock is released manually; the outbox is flushed on release (or automatically on the next page mount as a safety net).

## Considered options

**A — Installable PWA with service worker (Serwist/next-pwa):** enables cold-start offline and true background sync. Rejected: requires a new dependency (blocked by CLAUDE.md standing rule without explicit approval), a manifest + icon asset pass, and SW cache-versioning complexity. The primary audience (mobile, mid-flight) does not need cold-start — they load the page before boarding.

**B — Service worker for caching only, no install prompt:** enables cold-start without installability. Rejected for the same dependency and complexity reasons; the marginal benefit over option C does not justify the overhead.

**C — Client-side lock mode (chosen):** zero new dependencies, ships in one feature increment, covers the real failure mode (accidental refresh/navigation while offline). Works as long as the tab was loaded before going offline — an acknowledged constraint.

## Consequences

- Cold start (closed tab, rebooted phone) is not supported. Players must load the page before going offline.
- The Offline Score Outbox is a single overwriting localStorage entry `{ gameId, puzzleDate, deviceId, score, displayName }`. It is not a queue — `game_scores` upserts by `(device_id, game_id, puzzle_date)`, so only the latest score matters.
- `game_state` (found-words cross-device sync) is not queued. It self-heals: the first word found after reconnect triggers a push of the full `foundWords` array via the existing `useGameStateSync` path.
- Offline Lock is restricted to Leksokipos Daily Puzzles. Custom Puzzles have no leaderboard and no `puzzleDate` to key an outbox entry on.
- If this constraint becomes unacceptable (cold-start needed, or other games require offline support), add a service worker as a separate increment — the outbox and lock toggle are additive-compatible with SW caching.
