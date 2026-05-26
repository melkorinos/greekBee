"use client";

// useLeksiarxeioScoreSubmission — score-posting lifecycle for daily Leksiarxeio.
//
// Interface: submit(length, attempts, won) — three values, nothing else to know.
//
// Hides:
//   - failed-game → 7-attempts penalty mapping
//   - display-name ref pattern (latest name always used, stable submit ref)
//   - fetch URL + JSON field names
//   - error silencing (handled by postScore)
//   - no-op when deviceId is unknown

import { postScore } from "@/lib/postScore";
import { useCallback, useEffect, useRef } from "react";

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
  const displayNameRef = useRef(displayName);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  const submit = useCallback(
    (length: number, attempts: number, won: boolean) => {
      if (!deviceId) return;
      postScore("/api/leksiarxeio-scores", {
        puzzle_date:  today,
        word_length:  length,
        device_id:    deviceId,
        attempts:     won ? attempts : 7,
        display_name: displayNameRef.current || "Ανώνυμος",
      });
    },
    [today, deviceId],
  );

  return { submit };
}
