"use client";

// useScoreSubmission — the Platform's one score-posting hook. Its `gameId` is
// `ScoreSubmissionGameId`, so exactly the Games declaring the `scores` capability
// can call it and the list never needs restating here.
//
// Hides:
//   - "only POST when score strictly increases" dedup guard (submit)
//   - display-name ref pattern (always reads latest name at call time, stable fn refs)
//   - fetch URL + JSON field names
//   - error silencing — score posting must never crash the game
//   - no-op when disabled or deviceId unknown
//
// A Score is the whole payload: no game may ride per-round metadata along into
// game_scores.data. Leksokipos posted { words, pangrams } there until 2026-08-16
// with no reader, and the Offline Outbox flush dropped them anyway — see the
// commit and CONTEXT.md's game_scores row. Nothing writes `game_scores.data` at
// all since ADR 0027 removed Λεξιαρχείο's server-side per-length fold.

import { useCallback, useEffect, useRef } from "react";

import type { GameIdWith } from "@/config/games";
import { postScore, sanitizeDisplayName } from "@/lib/postScore";
import { writeOutboxEntry } from "@/lib/offlineOutbox";
import { useOfflineMode } from "@/hooks/useOfflineMode";

/**
 * Games whose Score this hook may post — the ones whose registry row declares the
 * `scores` capability, and nothing else.
 *
 * Opt-IN, deliberately. This is the one surface that writes to the shared
 * production database, so registering a Game must not be enough to earn it: a Game
 * with no capabilities cannot be passed here at all, and the fix is one line in
 * src/config/games.ts rather than an exclusion list nobody remembers to edit.
 */
export type ScoreSubmissionGameId = GameIdWith<"scores">;

interface UseScoreSubmissionOptions {
  /** Which game's leaderboard to post to. */
  gameId:      ScoreSubmissionGameId;
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
    (score: number) => {
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
      postScore("/api/game-scores", {
        game_id:      gameId,
        puzzle_date:  puzzleDate,
        device_id:    deviceId,
        score,
        display_name: sanitizeDisplayName(displayNameRef.current),
      });
    },
    [enabled, gameId, puzzleDate, deviceId],
  );

  /** Force-post with a new name, bypassing the strictly-increasing guard. */
  const submitWithName = useCallback(
    (score: number, name: string) => {
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

      postScore("/api/game-scores", {
        game_id:      gameId,
        puzzle_date:  puzzleDate,
        device_id:    deviceId,
        score,
        display_name: sanitizeDisplayName(name),
      });
    },
    [enabled, gameId, puzzleDate, deviceId],
  );

  return { submit, submitWithName };
}
