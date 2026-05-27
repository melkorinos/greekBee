"use client";

// useScoreSubmission — unified score-posting hook for all three games.
//
// Interface:
//   submit(score)                          — Leksokipos + Leksindeseis
//   submitWithName(score, name)            — Leksokipos + Leksindeseis
//   submitLength(length, attempts, won)    — Leksiarxeio only
//
// Hides:
//   - "only POST when score strictly increases" dedup guard (submit/submitWithName)
//   - failed-game → 7-attempt penalty mapping (submitLength)
//   - display-name ref pattern (always reads latest name at call time, stable fn refs)
//   - fetch URL + JSON field names per endpoint
//   - error silencing — score posting must never crash the game
//   - no-op when disabled or deviceId unknown

import { useCallback, useEffect, useRef } from "react";

function postScore(url: string, body: unknown): void {
  fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  }).catch(() => {});
}

interface UseScoreSubmissionOptions {
  /** Which game's leaderboard to post to. */
  gameId:      "leksokipos" | "leksindeseis" | "leksiarxeio";
  /** The puzzle date (YYYY-MM-DD) — used as the leaderboard partition key. */
  puzzleDate:  string;
  /** Stable anonymous device identifier. Empty string = skip posting. */
  deviceId:    string;
  /** Current display name — may change when the player saves a new name. */
  displayName: string;
  /** When false (e.g. custom puzzle) no requests are ever made. Default: true. */
  enabled?:    boolean;
}

export function useScoreSubmission({
  gameId,
  puzzleDate,
  deviceId,
  displayName,
  enabled = true,
}: UseScoreSubmissionOptions) {
  const displayNameRef = useRef(displayName);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  const lastPostedRef = useRef(0);

  // ── Leksokipos + Leksindeseis ──────────────────────────────────────────────

  const submit = useCallback(
    (score: number) => {
      if (!enabled || !deviceId) return;
      if (score <= 0 || score <= lastPostedRef.current) return;
      lastPostedRef.current = score;
      postScore("/api/game-scores", {
        game_id:      gameId,
        puzzle_date:  puzzleDate,
        device_id:    deviceId,
        score,
        display_name: displayNameRef.current || "Ανώνυμος",
      });
    },
    [enabled, gameId, puzzleDate, deviceId],
  );

  /** Force-post with a new name, bypassing the strictly-increasing guard. */
  const submitWithName = useCallback(
    (score: number, name: string) => {
      if (!enabled || !deviceId || score <= 0) return;
      postScore("/api/game-scores", {
        game_id:      gameId,
        puzzle_date:  puzzleDate,
        device_id:    deviceId,
        score,
        display_name: name || "Ανώνυμος",
      });
    },
    [enabled, gameId, puzzleDate, deviceId],
  );

  // ── Leksiarxeio ────────────────────────────────────────────────────────────

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

  return { submit, submitWithName, submitLength };
}
