// Offline Score Outbox (ADR 0010) — pending Scores earned while Offline Mode is active.
//
// Storage shape: a localStorage record keyed by `${gameId}:${puzzleDate}`, overwriting
// per key. This is NOT an append queue — `game_scores` upserts by
// (device_id, game_id, puzzle_date), so only the latest Score per key matters.
// Keying per game (rather than one global entry) stops a second game played offline
// from silently discarding the first game's pending Score.
//
// This module is the documented exception to the "useGameStore is the only
// localStorage writer" rule: the outbox is not game state and does not belong in the
// `wordgames:state` envelope, so it gets its own key — same reasoning as
// `leksokipos-variant`. See ADR 0010 §Consequences.
//
// Kept free of React so the flush ordering and the keep-on-failure rule — the two
// places the handoff flags as bug-prone — are testable as pure functions.

const OUTBOX_KEY = "wordgames:offline-outbox";

/** A Score earned while offline, waiting to be posted to `game_scores`. */
export interface OutboxEntry {
  gameId:      string;
  puzzleDate:  string;
  deviceId:    string;
  score:       number;
  displayName: string;
}

/** The wire body `POST /api/game-scores` expects. */
interface ScoreBody {
  game_id:      string;
  puzzle_date:  string;
  device_id:    string;
  score:        number;
  display_name: string;
}

/** Posts one entry and reports whether it was accepted. See `postScoreAwaitable`. */
type PostFn = (url: string, body: ScoreBody) => Promise<boolean>;

type OutboxRecord = Record<string, OutboxEntry>;

/** The storage key for an entry — one per (gameId, puzzleDate). */
export function outboxKey(entry: Pick<OutboxEntry, "gameId" | "puzzleDate">): string {
  return `${entry.gameId}:${entry.puzzleDate}`;
}

/** Read the raw keyed record. Returns {} when absent, corrupt, or unavailable. */
function readRecord(): OutboxRecord {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as OutboxRecord;
  } catch {
    return {};
  }
}

/** Write the raw keyed record. Silently swallows errors — a full quota must not crash a round. */
function writeRecord(record: OutboxRecord): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(record));
  } catch {
    // localStorage unavailable (private browsing, storage full) — the round continues
  }
}

/** Every pending entry. Empty when nothing is queued. */
export function readOutbox(): OutboxEntry[] {
  return Object.values(readRecord());
}

/** Queue a Score, replacing any pending Score for the same (gameId, puzzleDate). */
export function writeOutboxEntry(entry: OutboxEntry): void {
  writeRecord({ ...readRecord(), [outboxKey(entry)]: entry });
}

/** Drop a single pending entry, leaving the others untouched. */
export function clearOutboxEntry(entry: Pick<OutboxEntry, "gameId" | "puzzleDate">): void {
  const record = readRecord();
  delete record[outboxKey(entry)];
  writeRecord(record);
}

/**
 * Apply a name save to every pending entry — a player who renames while offline
 * expects the new name on the Scores that have not been posted yet.
 */
export function setOutboxDisplayName(displayName: string): void {
  const record = readRecord();
  for (const key of Object.keys(record)) {
    record[key] = { ...record[key]!, displayName };
  }
  writeRecord(record);
}

/**
 * Post every pending entry, clearing the ones that succeed and KEEPING the ones
 * that fail so they are retried on the next deactivate or page mount.
 *
 * Entries are cleared individually and re-read from storage after each post, so a
 * Score queued while the flush is in flight is never clobbered by a stale snapshot.
 */
export async function flushOutbox(post: PostFn): Promise<{ flushed: number; kept: number }> {
  const pending = readOutbox();
  let flushed = 0;
  let kept    = 0;

  for (const entry of pending) {
    let ok = false;
    try {
      ok = await post("/api/game-scores", {
        game_id:      entry.gameId,
        puzzle_date:  entry.puzzleDate,
        device_id:    entry.deviceId,
        score:        entry.score,
        display_name: entry.displayName,
      });
    } catch {
      // A thrown post is a failed post — keep the entry.
      ok = false;
    }

    if (!ok) {
      kept += 1;
      continue;
    }

    // Re-read so a higher Score queued during the post survives the clear.
    const current = readRecord()[outboxKey(entry)];
    if (!current || current.score <= entry.score) clearOutboxEntry(entry);
    flushed += 1;
  }

  return { flushed, kept };
}
