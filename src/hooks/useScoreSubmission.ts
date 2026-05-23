// useScoreSubmission — owns the score-posting lifecycle for daily Leksokipos puzzles.
//
// Interface: submit(score) — one call, nothing else to know.
//
// Hides:
//   - "only POST when score strictly increases" guard
//   - display-name ref pattern to avoid stale closures
//   - fetch URL + JSON field names
//   - error silencing (network errors must not crash the game)
//   - no-op when the puzzle is not a daily puzzle or deviceId is not yet known

"use client";

import { postScore } from "@/lib/postScore";
import { useCallback, useEffect, useRef } from "react";

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

/**
 * Returns a stable `submit(score)` function.
 *
 * Calling submit(score) will POST to /api/scores only when:
 *   - enabled is true
 *   - deviceId is non-empty
 *   - score is strictly greater than the last successfully posted score
 */
export function useScoreSubmission({
  puzzleId,
  deviceId,
  displayName,
  enabled,
}: UseScoreSubmissionOptions) {
  // Track the last score we successfully sent so we never regress.
  const lastPostedRef   = useRef(0);
  // Stable ref to the latest displayName — avoids re-creating submit() on every name change.
  const displayNameRef  = useRef(displayName);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  const submit = useCallback(
    (score: number) => {
      if (!enabled || !deviceId) return;
      if (score <= 0 || score <= lastPostedRef.current) return;
      lastPostedRef.current = score;
      postScore("/api/game-scores", {
        game_id:      "leksokipos",
        puzzle_date:  puzzleId,
        device_id:    deviceId,
        display_name: displayNameRef.current || "Ανώνυμος",
        score,
      });
    },
    // puzzleId and deviceId are stable across a session; enabled rarely changes.
    // displayName is intentionally excluded — read via ref to avoid churn.
    [enabled, puzzleId, deviceId]
  );

  /**
   * Force-post the current score with a new display name.
   * Called when the player saves a name change so the leaderboard row is updated
   * immediately, bypassing the "strictly increasing" guard.
   */
  const submitWithName = useCallback(
    (score: number, name: string) => {
      if (!enabled || !deviceId || score <= 0) return;
      postScore("/api/game-scores", {
        game_id:      "leksokipos",
        puzzle_date:  puzzleId,
        device_id:    deviceId,
        display_name: name || "Ανώνυμος",
        score,
      });
    },
    [enabled, puzzleId, deviceId]
  );

  return { submit, submitWithName };
}
