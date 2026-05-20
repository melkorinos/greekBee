// useWordleScoreSubmission — owns the score-posting lifecycle for daily Wordle GR.
//
// Interface: submit(length, attempts, won) — three values, nothing else to know.
//
// Hides:
//   - failed-game → 7-attempts mapping
//   - display-name read from the identity slice
//   - fetch URL + JSON field names
//   - error silencing
//   - no-op when deviceId is not yet known

"use client";

import { readSlice } from "@/hooks/useGameStore";
import { useCallback } from "react";

interface WordleIdentitySlice {
  deviceId:    string;
  displayName: string;
}

interface UseWordleScoreSubmissionOptions {
  /** The game date (YYYY-MM-DD) — used as the leaderboard partition key. */
  today:    string;
  /** Stable anonymous device identifier. Empty string = skip posting. */
  deviceId: string;
}

/**
 * Returns a stable `submit(length, attempts, won)` function.
 *
 * Calling submit() will POST to /api/wordle-scores with:
 *   - attempts = `attempts` when won, 7 when lost (penalty)
 *   - display_name read live from the identity slice at call time
 */
export function useWordleScoreSubmission({
  today,
  deviceId,
}: UseWordleScoreSubmissionOptions) {
  const submit = useCallback(
    (length: number, attempts: number, won: boolean) => {
      if (!deviceId) return;
      const attemptsToPost = won ? attempts : 7;
      const sl   = readSlice<WordleIdentitySlice>("wordle-identity");
      const name = sl?.displayName || "Ανώνυμος";
      fetch("/api/wordle-scores", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          puzzle_date:  today,
          word_length:  length,
          device_id:    deviceId,
          display_name: name,
          attempts:     attemptsToPost,
        }),
      }).catch(() => {}); // silently swallow network errors
    },
    [today, deviceId]
  );

  return { submit };
}
