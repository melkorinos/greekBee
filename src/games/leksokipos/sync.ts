// leksokipos/sync.ts — the cross-device game_state wire for Leksokipos.
//
// Owns BOTH directions of sync, so the endpoint, the JSON shape, and the
// snapshot reconstruction live in exactly one place. Previously the push was
// here-ish (inlined in useGameStateSync) and the pull was copy-pasted twice
// inside useGameState (mount-time + restoreFromServer) — that duplication is
// the kind of drift that produced "the name synced but the found words didn't".
//
// No React here: the hooks own the effects, the gates, and the dispatch. This
// module owns only what crosses the wire. Server-wins restore (ADR-0003):
// pullSnapshot rebuilds the whole round from { foundWords } alone — score and
// rank are recomputed from the puzzle, startedAt is reset, givenUp is false.

import type { LeksokiposPuzzle, LeksokiposRoundSnapshot } from "./types";
import { calculateRank } from "./lib/ranking";
import { maxScore, scoreWord } from "./lib/scoring";

const ENDPOINT = "/api/game-state";
const ACHIEVEMENTS_ENDPOINT = "/api/achievements";
const PANGRAMS_ENDPOINT = "/api/pangrams";
const STATS_ENDPOINT = "/api/profile/stats";
const GAME_ID = "leksokipos";

/** The lifetime numbers the tiered-badge lanes read back on mount (one fetch). */
export interface LifetimeStatsRead {
  /** Cumulative Leksokipos points — feeds the Συλλέκτης Πόντων tier lane. */
  leksokipos_points: number | null;
  /** Size of the append-only pangram set — feeds the Κυνηγός Πανγκράμ self-heal. */
  pangram_count:     number | null;
}

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
    const data = (await res.json()) as { leksokipos_points?: number; pangram_count?: number };
    return {
      leksokipos_points: typeof data.leksokipos_points === "number" ? data.leksokipos_points : null,
      pangram_count:     typeof data.pangram_count === "number" ? data.pangram_count : null,
    };
  } catch {
    return null;
  }
}

/**
 * Delta-post the pangram words a device just found and return its fresh lifetime
 * count (COUNT(*) over player_pangrams). Insert-if-absent server-side, so posting
 * an already-recorded find is a no-op. Returns null on any network/parse error so
 * the caller simply skips the crossing check this batch — the mount self-heal and
 * a later session recover it. Never throws (earning never affects gameplay).
 */
export async function postPangrams(params: {
  deviceUuid: string;
  puzzleDate: string;
  words:      string[];
}): Promise<number | null> {
  const { deviceUuid, puzzleDate, words } = params;
  try {
    const res = await fetch(PANGRAMS_ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ device_uuid: deviceUuid, puzzle_date: puzzleDate, words }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: number };
    return typeof data.count === "number" ? data.count : null;
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

    const score = foundWords.reduce((sum, w) => sum + scoreWord(w, puzzle), 0);
    return {
      foundWords,
      score,
      currentRank: calculateRank(score, maxScore(puzzle)),
      startedAt:   Date.now(),
      givenUp:     false,
    };
  } catch {
    // Network/parse failure — leave local state as-is.
    return null;
  }
}
