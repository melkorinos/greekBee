"use client";

// useLeksiarxeioScoreSubmission — posts per-length results to /api/leksiarxeio-scores.
//
// Hides:
//   - failed-game → 7-attempt penalty mapping
//   - display-name ref pattern (always reads latest name at call time, stable fn ref)
//   - fetch URL + JSON field names
//   - error silencing — score posting must never crash the game
//   - no-op when deviceId is unknown

import { useCallback, useEffect, useRef } from "react";

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

  /** Post a per-length result. Maps a failed game (won=false) to a 7-attempt penalty. */
  const submitLength = useCallback(
    (length: number, attempts: number, won: boolean) => {
      if (!deviceId) return;
      postScore("/api/leksiarxeio-scores", {
        puzzle_date:  puzzleDate,
        word_length:  length,
        device_id:    deviceId,
        attempts:     won ? attempts : 7,
        display_name: displayNameRef.current || "Ανώνυμος",
      });
    },
    [puzzleDate, deviceId],
  );

  return { submitLength };
}
