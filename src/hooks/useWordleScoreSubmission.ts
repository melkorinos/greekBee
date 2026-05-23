// useWordleScoreSubmission — owns the score-posting lifecycle for daily Leksiarxeio.
//
// Interface: submit(length, attempts, won) — three values, nothing else to know.
//
// Hides:
//   - failed-game → 7-attempts mapping
//   - display-name ref pattern to avoid stale closures
//   - fetch URL + JSON field names
//   - error silencing
//   - no-op when deviceId is not yet known

"use client";

import { postScore } from "@/lib/postScore";
import { useCallback, useEffect, useRef } from "react";

interface UseWordleScoreSubmissionOptions {
  /** The game date (YYYY-MM-DD) — used as the leaderboard partition key. */
  today:       string;
  /** Stable anonymous device identifier. Empty string = skip posting. */
  deviceId:    string;
  /** Current display name — may change when the player saves a new name. */
  displayName: string;
}

/**
 * Returns a stable `submit(length, attempts, won)` function.
 *
 * Calling submit() will POST to /api/wordle-scores with:
 *   - attempts = `attempts` when won, 7 when lost (penalty)
 *   - display_name read via ref so it's always current without re-creating submit()
 */
export function useWordleScoreSubmission({
  today,
  deviceId,
  displayName,
}: UseWordleScoreSubmissionOptions) {
  const displayNameRef = useRef(displayName);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  const submit = useCallback(
    (length: number, attempts: number, won: boolean) => {
      if (!deviceId) return;
      postScore("/api/leksiarxeio-scores", {
        puzzle_date:  today,
        word_length:  length,
        device_id:    deviceId,
        display_name: displayNameRef.current || "Ανώνυμος",
        attempts:     won ? attempts : 7,
      });
    },
    // displayName intentionally excluded — read via ref to avoid churn.
    [today, deviceId]
  );

  return { submit };
}
