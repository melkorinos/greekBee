"use client";

// useLiveScorePost — the platform's continuous-score-posting policy for the
// round-based games (Leksodromia, Leksoplegma). It owns the effect that both
// Boards used to copy verbatim; the Board keeps zero posting logic.
//
// Policy (single source of truth):
//   - post the current score on every increase — useScoreSubmission's
//     strictly-increasing guard dedups, so abandoned rounds still reach the
//     leaderboard without ever double-posting;
//   - never post from a restored round the player has not touched this session
//     (`hasLiveActed` — the round spine flips it on the first live dispatch and
//     never on its own RESTORE_STATE);
//   - once, when the round finishes, open the leaderboard after a short delay.
//
// The Board hands over the live score, the finished flag, the spine's
// `hasLiveActed` getter, the post fn, and the open-leaderboard fn.

import { useEffect, useRef } from "react";

interface UseLiveScorePostOptions {
  /** Current live round score. */
  score:        number;
  /** True once the round has finished. */
  isFinished:   boolean;
  /** Reads whether the player has made a live (non-restored) action this session. */
  hasLiveActed: () => boolean;
  /** Posts the score (dedups strictly-increasing internally). */
  post:         (score: number) => void;
  /** Opens the leaderboard — fired once, `delayMs` after the round finishes. */
  onFinish:     () => void;
  /** Delay before the leaderboard opens on finish. Default 1500 ms. */
  delayMs?:     number;
}

export function useLiveScorePost({
  score,
  isFinished,
  hasLiveActed,
  post,
  onFinish,
  delayMs = 1500,
}: UseLiveScorePostOptions): void {
  const finishedHandledRef = useRef(false);
  useEffect(() => {
    if (!hasLiveActed()) return; // a restored, untouched round never posts
    post(score); // dedup: only strictly-increasing scores actually go out
    if (!isFinished || finishedHandledRef.current) return;
    finishedHandledRef.current = true;
    const t = setTimeout(onFinish, delayMs);
    return () => clearTimeout(t);
  }, [score, isFinished, hasLiveActed, post, onFinish, delayMs]);
}
