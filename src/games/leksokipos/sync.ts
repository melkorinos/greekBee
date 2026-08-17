// leksokipos/sync.ts — the cross-device game_state wire for Leksokipos.
//
// Owns BOTH directions of sync, so the endpoint, the JSON shape, and the
// snapshot reconstruction live in exactly one place. Previously the push was
// here-ish (inlined in useGameStateSync) and the pull was copy-pasted twice
// inside useGameState — that duplication is the kind of drift that produced
// "the name synced but the found words didn't". Both callers now go through
// useGameState's single restoreRound().
//
// No React here: the hooks own the effects, the gates, and the dispatch. This
// module owns only what crosses the wire. Server-wins restore (ADR-0003):
// pullSnapshot rebuilds the whole round from { foundWords } alone — score and
// rank are recomputed from the puzzle, startedAt is reset, givenUp is false.

import type { LeksokiposPuzzle, LeksokiposRoundSnapshot } from "./types";
import { buildSnapshotFromWords } from "./lib/reconcile";

const ENDPOINT = "/api/game-state";
const ACHIEVEMENTS_ENDPOINT = "/api/achievements";
const MILESTONES_ENDPOINT = "/api/milestones";
const STATS_ENDPOINT = "/api/profile/stats";
const GAME_ID = "leksokipos";

/** The lifetime numbers the tiered-badge lanes read back on mount (one fetch). */
export interface LifetimeStatsRead {
  /** Cumulative Leksokipos points — feeds the Συλλέκτης Πόντων tier lane. */
  leksokipos_points: number | null;
  /** Size of the append-only pangram set — feeds the Κυνηγός Πανγκράμ self-heal. */
  pangram_count:     number | null;
  /** Days the top rank was reached — feeds the Στην Κορυφή self-heal. */
  top_rank_count:    number | null;
  /** Days the found-word ratio was crossed — feeds the Τζιμάνι self-heal. */
  tzimani_count:     number | null;
}

/** One milestone to record — the wire shape of a player_milestones row's payload. */
export interface MilestonePost {
  kind:    "pangram" | "word" | "top_rank" | "tzimani";
  /** The word, on the two find kinds. Omitted on the day counters. */
  detail?: string;
  /** The found-word percentage, on tzimani only. Word length is stamped server-side. */
  value?:  number;
}

/** Fresh lifetime totals, keyed by kind — only for the kinds the POST actually wrote. */
export type MilestoneCounts = Partial<Record<MilestonePost["kind"], number>>;

/**
 * Read this device's lifetime stats for the tiered-badge lanes in ONE round-trip
 * (both the points lane and the pangram self-heal lane read from this response —
 * never two stats fetches per mount). Any missing / non-number field comes back
 * null so the caller skips that lane; null overall on network/parse error so
 * earning never blocks play.
 */
export async function fetchLifetimeStats(deviceUuid: string): Promise<LifetimeStatsRead | null> {
  try {
    const res = await fetch(
      `${STATS_ENDPOINT}?device_uuid=${encodeURIComponent(deviceUuid)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<Record<keyof LifetimeStatsRead, number>>;
    const num = (v: number | undefined) => (typeof v === "number" ? v : null);
    return {
      leksokipos_points: num(data.leksokipos_points),
      pangram_count:     num(data.pangram_count),
      top_rank_count:    num(data.top_rank_count),
      tzimani_count:     num(data.tzimani_count),
    };
  } catch {
    return null;
  }
}

/**
 * Delta-post the milestones a device just reached and return its fresh lifetime
 * totals for the kinds that were actually recorded. One call for all four kinds,
 * replacing the separate pangram and word posts (ADR 0013).
 *
 * Insert-if-absent server-side, so posting an already-recorded milestone is a
 * no-op — and because the server skips its count query when nothing was written, a
 * pure re-post comes back as an EMPTY map. That is a normal answer meaning "no
 * total moved", not an error: a caller reads a missing kind as "no crossing to
 * check", and the mount self-heal covers the gap.
 *
 * Returns null on any network/parse error, so the caller simply skips the crossing
 * check this batch. Never throws (earning never affects gameplay).
 */
export async function postMilestones(params: {
  deviceUuid: string;
  puzzleDate: string;
  milestones: MilestonePost[];
}): Promise<MilestoneCounts | null> {
  const { deviceUuid, puzzleDate, milestones } = params;
  try {
    const res = await fetch(MILESTONES_ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        device_uuid: deviceUuid,
        puzzle_date: puzzleDate,
        milestones,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { counts?: MilestoneCounts };
    return data.counts && typeof data.counts === "object" ? data.counts : null;
  } catch {
    return null;
  }
}

/**
 * Post newly-earned achievement ids for a device. Fire-and-forget: the server
 * insert-if-absents them, so re-posting is harmless and network errors are
 * swallowed (earning never affects gameplay). No-op on an empty list.
 */
export function postAchievements(params: {
  deviceUuid:     string;
  achievementIds: string[];
}): void {
  const { deviceUuid, achievementIds } = params;
  if (achievementIds.length === 0) return;
  fetch(ACHIEVEMENTS_ENDPOINT, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ device_uuid: deviceUuid, achievement_ids: achievementIds }),
  }).catch(() => {});
}

/**
 * Read the achievement ids this device has already earned (GET /api/achievements).
 * Used by the unlock toast to suppress badges earned in a prior session. Returns
 * [] on any network/parse error so the toast simply stays quiet (never blocks play).
 */
export async function fetchEarnedAchievementIds(deviceUuid: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${ACHIEVEMENTS_ENDPOINT}?device_uuid=${encodeURIComponent(deviceUuid)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { earned?: string[] };
    return Array.isArray(data.earned) ? data.earned : [];
  } catch {
    return [];
  }
}

/**
 * Upload the current found words for a daily puzzle. Fire-and-forget: network
 * errors are swallowed so syncing never affects gameplay.
 */
export function pushFoundWords(params: {
  deviceUuid: string;
  puzzleDate: string;
  foundWords: string[];
}): void {
  const { deviceUuid, puzzleDate, foundWords } = params;
  fetch(ENDPOINT, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      device_uuid: deviceUuid,
      game_id:     GAME_ID,
      puzzle_date: puzzleDate,
      state:       { foundWords },
    }),
  }).catch(() => {});
}

/**
 * Fetch the server's found words for a puzzle and rebuild the round snapshot.
 *
 * Returns null when there is nothing to restore — no row, an empty list, or any
 * network/parse error — so the caller leaves local state untouched. A non-null
 * result is a complete snapshot ready to dispatch as RESTORE_STATE.
 */
export async function pullSnapshot(params: {
  deviceUuid: string;
  puzzleDate: string;
  puzzle:     LeksokiposPuzzle;
}): Promise<LeksokiposRoundSnapshot | null> {
  const { deviceUuid, puzzleDate, puzzle } = params;
  try {
    const res = await fetch(
      `${ENDPOINT}?device_uuid=${encodeURIComponent(deviceUuid)}` +
        `&game_id=${GAME_ID}&puzzle_date=${encodeURIComponent(puzzleDate)}`,
    );
    const data = (await res.json()) as { state?: { foundWords?: string[] } | null };
    const foundWords = data.state?.foundWords;
    if (!Array.isArray(foundWords) || foundWords.length === 0) return null;

    // Words the puzzle no longer accepts are dropped here — a stored round is
    // keyed on the date alone, so a corpus edit can hand back another board's
    // words. See lib/reconcile.ts.
    const snapshot = buildSnapshotFromWords(foundWords, puzzle, {
      startedAt: Date.now(),
      givenUp:   false,
    });
    return snapshot.foundWords.length === 0 ? null : snapshot;
  } catch {
    // Network/parse failure — leave local state as-is.
    return null;
  }
}
