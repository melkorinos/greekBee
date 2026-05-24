"use client";

// useLeksiarxeioScoreSubmission — score-posting lifecycle for daily Leksiarxeio.
//
// Interface: submit(length, attempts, won) — three values, nothing else to know.
//
// Hides:
//   - failed-game → 7-attempts penalty mapping
//   - display-name ref pattern (via useScorePost)
//   - fetch URL + JSON field names
//   - error silencing (handled by postScore)
//   - no-op when deviceId is unknown

import { useCallback } from "react";
import { useScorePost } from "./useScorePost";

interface UseLeksiarxeioScoreSubmissionOptions {
  /** The game date (YYYY-MM-DD) — used as the leaderboard partition key. */
  today:       string;
  /** Stable anonymous device identifier. Empty string = skip posting. */
  deviceId:    string;
  /** Current display name — may change when the player saves a new name. */
  displayName: string;
}

export function useLeksiarxeioScoreSubmission({
  today,
  deviceId,
  displayName,
}: UseLeksiarxeioScoreSubmissionOptions) {
  const { post } = useScorePost(displayName);

  const submit = useCallback(
    (length: number, attempts: number, won: boolean) => {
      if (!deviceId) return;
      post("/api/leksiarxeio-scores", {
        puzzle_date: today,
        word_length: length,
        device_id:   deviceId,
        attempts:    won ? attempts : 7,
      });
    },
    [today, deviceId, post],
  );

  return { submit };
}
