"use client";

// useLeksindeseisScoreSubmission — score-posting lifecycle for daily Leksindeseis.
//
// Interface: submit(score) — one call, nothing else to know.
//
// Hides:
//   - "only POST when score strictly increases" dedup guard
//   - display-name ref pattern (via useScorePost)
//   - fetch URL + JSON field names
//   - error silencing (handled by postScore)
//   - no-op when deviceId is unknown

import { useCallback, useRef } from "react";
import { useScorePost } from "./useScorePost";

interface UseLeksindeseisScoreSubmissionOptions {
  /** The puzzle date (YYYY-MM-DD) — used as the leaderboard partition key. */
  puzzleDate:  string;
  /** Stable anonymous device identifier. Empty string = skip posting. */
  deviceId:    string;
  /** Current display name — may change when the player saves a new name. */
  displayName: string;
}

export function useLeksindeseisScoreSubmission({
  puzzleDate,
  deviceId,
  displayName,
}: UseLeksindeseisScoreSubmissionOptions) {
  const { post } = useScorePost(displayName);
  const lastPostedRef = useRef(0);

  const submit = useCallback(
    (score: number) => {
      if (!deviceId) return;
      if (score <= 0 || score <= lastPostedRef.current) return;
      lastPostedRef.current = score;
      post("/api/game-scores", {
        game_id:     "leksindeseis",
        puzzle_date: puzzleDate,
        device_id:   deviceId,
        score,
      });
    },
    [puzzleDate, deviceId, post],
  );

  const submitWithName = useCallback(
    (score: number, name: string) => {
      if (!deviceId || score <= 0) return;
      post("/api/game-scores", {
        game_id:     "leksindeseis",
        puzzle_date: puzzleDate,
        device_id:   deviceId,
        score,
      }, name || "Ανώνυμος");
    },
    [puzzleDate, deviceId, post],
  );

  return { submit, submitWithName };
}
