"use client";

// useLeksiarxeioScoreSubmission — posts per-length results to /api/game-scores.
//
// Hides:
//   - failed-game → 0-points mapping (via scoreLeksiarxeio)
//   - display-name ref pattern (always reads latest name at call time, stable fn ref)
//   - fetch URL + JSON field names
//   - error silencing — score posting must never crash the game
//   - no-op when deviceId is unknown

import { useCallback, useEffect, useRef } from "react";

import { scoreLeksiarxeio } from "@/games/leksiarxeio/lib";

function postScore(url: string, body: unknown): void {
  fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  }).catch(() => {});
}

interface UseLeksiarxeioScoreSubmissionOptions {
  /** The puzzle date (YYYY-MM-DD) — used as the leaderboard partition key. */
  puzzleDate:  string;
  /** Stable anonymous device identifier. Empty string = skip posting. */
  deviceId:    string;
  /** Current display name — may change when the player saves a new name. */
  displayName: string;
}

export function useLeksiarxeioScoreSubmission({
  puzzleDate,
  deviceId,
  displayName,
}: UseLeksiarxeioScoreSubmissionOptions) {
  const displayNameRef = useRef(displayName);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  /** Post a per-length result. Converts attempts+won to in-game points (0–6). */
  const submitLength = useCallback(
    (length: number, attempts: number, won: boolean) => {
      if (!deviceId) return;
      const points = scoreLeksiarxeio(attempts, won);
      postScore("/api/game-scores", {
        game_id:      "leksiarxeio",
        puzzle_date:  puzzleDate,
        word_length:  length,
        device_id:    deviceId,
        points,
        display_name: displayNameRef.current || "Ανώνυμος",
      });
    },
    [puzzleDate, deviceId],
  );

  return { submitLength };
}
