// useConnectionsScoreSubmission — owns the score-posting lifecycle for daily Connections puzzles.
//
// Interface: submit(score) — one call, nothing else to know.
//
// Hides:
//   - "only POST when score strictly increases" dedup guard
//   - display-name ref pattern to avoid stale closures
//   - fetch URL + JSON field names
//   - error silencing
//   - no-op when deviceId is not yet known

"use client";

import { postScore } from "@/lib/postScore";
import { useCallback, useEffect, useRef } from "react";

interface UseConnectionsScoreSubmissionOptions {
  /** The puzzle date (YYYY-MM-DD) — used as the leaderboard partition key. */
  puzzleDate:  string;
  /** Stable anonymous device identifier. Empty string = skip posting. */
  deviceId:    string;
  /** Current display name — may change when the player saves a new name. */
  displayName: string;
}

/**
 * Returns a stable `submit(score)` function.
 *
 * Calling submit(score) will POST to /api/connections-scores only when:
 *   - deviceId is non-empty
 *   - score is strictly greater than the last successfully posted score (dedup)
 *
 * For Connections, score = mistakesRemaining (1–4) when the player wins.
 * Lost games should never call submit().
 */
export function useConnectionsScoreSubmission({
  puzzleDate,
  deviceId,
  displayName,
}: UseConnectionsScoreSubmissionOptions) {
  const lastPostedRef  = useRef(0);
  const displayNameRef = useRef(displayName);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  const submit = useCallback(
    (score: number) => {
      if (!deviceId) return;
      if (score <= 0 || score <= lastPostedRef.current) return;
      lastPostedRef.current = score;
      postScore("/api/game-scores", {
        game_id:      "leksindeseis",
        puzzle_date:  puzzleDate,
        device_id:    deviceId,
        display_name: displayNameRef.current || "Ανώνυμος",
        score,
      });
    },
    [puzzleDate, deviceId]
  );

  const submitWithName = useCallback(
    (score: number, name: string) => {
      if (!deviceId || score <= 0) return;
      postScore("/api/game-scores", {
        game_id:      "leksindeseis",
        puzzle_date:  puzzleDate,
        device_id:    deviceId,
        display_name: name || "Ανώνυμος",
        score,
      });
    },
    [puzzleDate, deviceId]
  );

  return { submit, submitWithName };
}
