# ADR 0003 — Cross-device game state sync: server-wins, no merge

## Status
Accepted

## Context
Leksokipos players can transfer their identity to a second device via a TransferCode. After claiming, the new device receives the player's `device_uuid` and `display_name` but previously received no game progress (Found Words). The `game_state` table already existed and was used to push state to the server after each word, but nothing pulled it back.

Two restore strategies were considered:

**Option A — Union merge**: on restore, take the union of server foundWords and local foundWords. Always produces the maximal set.

**Option B — Server wins, no merge**: on restore, replace local with server state. If devices have diverged (player continued on Device A after transferring to Device B), the player must generate a fresh TransferCode from the device with more progress to resync.

## Decision
**Option B (server wins)**. The merge was rejected because:
- Found-word arrays diverge only when the player actively plays on two devices simultaneously, which is an edge case.
- Union merge adds complexity to the restore path (fetching local state, deduplicating, recomputing score).
- The TransferCode mechanism is already the explicit "I want to move to another device" gesture — requiring a fresh code for resync is consistent with that mental model.
- A player who keeps playing on Device A after transferring can simply generate a new code when they want Device B caught up.

## Consequences
- Restore logic is simple: fetch `{ foundWords }` from server, reconstruct snapshot, dispatch `RESTORE_STATE`.
- Players who play on two devices simultaneously will see stale progress on whichever device restores second — they need to re-transfer to fix it.
- `useGameStateSync` push payload is simplified to `{ foundWords }` only (score and currentInput dropped — both are derivable or ephemeral).
- Pull is gated on three conditions: `isProfileLinked`, `isDaily`, `local foundWords.length === 0`.
