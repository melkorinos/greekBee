"use client";

// useLiveScorePost — the platform's continuous-score-posting policy for the
// round-based games (Topothesies, Leksodromia, Leksoplegma). It owns the effect
// that those Boards used to copy verbatim; the Board keeps zero posting logic.
//
// Policy (single source of truth):
//   - post the current score on every increase — useScoreSubmission's
//     strictly-increasing guard dedups, so abandoned rounds still reach the
//     leaderboard without ever double-posting;
//   - never post from a restored round the player has not touched this session
//     (`hasLiveActed` — the round spine flips it on the first live dispatch and
//     never on its own RESTORE_STATE).
//
// It used to do a third thing: open the leaderboard 1.5 s after the round
// finished. That was removed on 2026-08-20, because Round End now renders the
// Result Panel in that spot and a modal sliding over the player's own summary is
// the shape ADR 0025 rejected. Every Game ends the same way now — the panel,
// with the leaderboard one tap away inside it — so the delay, the once-only
// latch and the `onFinish` callback are all gone rather than merely unused.

import { useEffect } from "react";

interface UseLiveScorePostOptions {
  /** Current live round score. */
  score:        number;
  /** True once the round has finished. Kept for the posting effect's deps. */
  isFinished:   boolean;
  /** Reads whether the player has made a live (non-restored) action this session. */
  hasLiveActed: () => boolean;
  /** Posts the score (dedups strictly-increasing internally). */
  post:         (score: number) => void;
}

export function useLiveScorePost({
  score,
  isFinished,
  hasLiveActed,
  post,
}: UseLiveScorePostOptions): void {
  useEffect(() => {
    if (!hasLiveActed()) return; // a restored, untouched round never posts
    post(score); // dedup: only strictly-increasing scores actually go out
  }, [score, isFinished, hasLiveActed, post]);
}
