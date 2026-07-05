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
const GAME_ID = "leksokipos";

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
