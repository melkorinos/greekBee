"use client";

// useScoreSubmission — score-posting hook for Leksokipos, Leksindeseis,
// Vres Tin Frasi, and Leksodromia.
// For Leksiarxeio use useLeksiarxeioScoreSubmission instead.
//
// Hides:
//   - "only POST when score strictly increases" dedup guard (submit)
//   - display-name ref pattern (always reads latest name at call time, stable fn refs)
//   - fetch URL + JSON field names
//   - error silencing — score posting must never crash the game
//   - no-op when disabled or deviceId unknown
//
// submit/submitWithName take an optional `data` record (counts only) that rides along
// into the row's jsonb — e.g. Leksokipos posts { words, pangrams } for fairness analysis.

import { useCallback, useEffect, useRef } from "react";

import { postScore, sanitizeDisplayName } from "@/lib/postScore";
import { writeOutboxEntry } from "@/lib/offlineOutbox";
import { useOfflineMode } from "@/hooks/useOfflineMode";

interface UseScoreSubmissionOptions {
  /** Which game's leaderboard to post to. */
  gameId:      "leksokipos" | "leksindeseis" | "vrestifrasi" | "leksodromia" | "leksoplegma" | "topothesies" | "posokanei" | "logopaignio";
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

  // While Offline Mode is active a real post fails silently and the Score is lost, so
  // it is queued to the Offline Score Outbox and flushed on deactivate (ADR 0010).
  // Read through a ref so toggling Offline Mode does not change the identity of
  // submit/submitWithName — GameBoard posts from an effect keyed on them.
  const { active: offlineActive } = useOfflineMode();
  const offlineRef = useRef(offlineActive);
  useEffect(() => { offlineRef.current = offlineActive; }, [offlineActive]);

  // ── Leksokipos + Leksindeseis ──────────────────────────────────────────────

  const submit = useCallback(
    (score: number, data?: Record<string, number>) => {
      if (!enabled || !deviceId) return;
      if (score <= 0 || score <= lastPostedRef.current) return;

      if (offlineRef.current) {
        // Deliberately does NOT advance lastPostedRef: the guard exists to suppress
        // duplicate POSTs, and a queued Score never reached the server. Advancing it
        // here would block the real post once the player is back online — and if the
        // flush failed, the Score would be lost with nothing left to retry.
        writeOutboxEntry({
          gameId:      gameId,
          puzzleDate:  puzzleDate,
          deviceId,
          score,
          displayName: sanitizeDisplayName(displayNameRef.current),
        });
        return;
      }

      lastPostedRef.current = score;
      const body: Record<string, unknown> = {
        game_id:      gameId,
        puzzle_date:  puzzleDate,
        device_id:    deviceId,
        score,
        display_name: sanitizeDisplayName(displayNameRef.current),
      };
      if (data) body.data = data;
      postScore("/api/game-scores", body);
    },
    [enabled, gameId, puzzleDate, deviceId],
  );

  /** Force-post with a new name, bypassing the strictly-increasing guard. */
  const submitWithName = useCallback(
    (score: number, name: string, data?: Record<string, number>) => {
      if (!enabled || !deviceId || score <= 0) return;

      if (offlineRef.current) {
        writeOutboxEntry({
          gameId:      gameId,
          puzzleDate:  puzzleDate,
          deviceId,
          score,
          displayName: sanitizeDisplayName(name),
        });
        return;
      }

      const body: Record<string, unknown> = {
        game_id:      gameId,
        puzzle_date:  puzzleDate,
        device_id:    deviceId,
        score,
        display_name: sanitizeDisplayName(name),
      };
      if (data) body.data = data;
      postScore("/api/game-scores", body);
    },
    [enabled, gameId, puzzleDate, deviceId],
  );

  return { submit, submitWithName };
}
