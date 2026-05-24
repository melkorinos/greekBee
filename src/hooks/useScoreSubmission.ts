"use client";

// useScoreSubmission — score-posting lifecycle for daily Leksokipos puzzles.
//
// Interface: submit(score) — one call, nothing else to know.
//
// Hides:
//   - "only POST when score strictly increases" guard
//   - display-name ref pattern (via useScorePost)
//   - fetch URL + JSON field names
//   - error silencing (handled by postScore)
//   - no-op when puzzle is not daily or deviceId is unknown

import { useCallback, useRef } from "react";
import { useScorePost } from "./useScorePost";

interface UseScoreSubmissionOptions {
  /** The puzzle date string used as the leaderboard key (YYYY-MM-DD). */
  puzzleId:    string;
  /** Stable anonymous device identifier. Empty string = skip posting. */
  deviceId:    string;
  /** Current display name — may change when the player saves a new name. */
  displayName: string;
  /** When false (e.g. custom puzzle) no requests are ever made. */
  enabled:     boolean;
}

export function useScoreSubmission({
  puzzleId,
  deviceId,
  displayName,
  enabled,
}: UseScoreSubmissionOptions) {
  const { post } = useScorePost(displayName);
  const lastPostedRef = useRef(0);

  const submit = useCallback(
    (score: number) => {
      if (!enabled || !deviceId) return;
      if (score <= 0 || score <= lastPostedRef.current) return;
      lastPostedRef.current = score;
      post("/api/game-scores", {
        game_id:     "leksokipos",
        puzzle_date: puzzleId,
        device_id:   deviceId,
        score,
      });
    },
    [enabled, puzzleId, deviceId, post],
  );

  /** Force-post with a new name, bypassing the strictly-increasing guard. */
  const submitWithName = useCallback(
    (score: number, name: string) => {
      if (!enabled || !deviceId || score <= 0) return;
      post("/api/game-scores", {
        game_id:     "leksokipos",
        puzzle_date: puzzleId,
        device_id:   deviceId,
        score,
      }, name || "Ανώνυμος");
    },
    [enabled, puzzleId, deviceId, post],
  );

  return { submit, submitWithName };
}
