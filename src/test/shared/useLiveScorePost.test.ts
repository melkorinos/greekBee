// useLiveScorePost.test.ts — the shared continuous-posting policy for the round
// games (Topothesies, Leksodromia, Leksoplegma). Verifies the two rules the
// Boards used to copy verbatim: a restored-untouched round never posts, and a
// live score posts on every change (dedup lives in useScoreSubmission).
//
// A THIRD rule was removed on 2026-08-20: the hook used to open the leaderboard
// 1.5 s after the round finished. Round End now renders the Result Panel there
// (ADR 0025), and a modal sliding over it is exactly the shape that decision
// rejected — so the hook posts scores and does nothing else. There is no
// `onFinish` and no delay to test any more; a reinstated one would have to
// answer why the leaderboard should cover the summary.

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useLiveScorePost } from "@/hooks/useLiveScorePost";

const acted = () => true;
const notActed = () => false;

describe("useLiveScorePost", () => {
  it("never posts when the player has not acted this session (restored round)", () => {
    const post = vi.fn();
    renderHook(() =>
      useLiveScorePost({ score: 120, isFinished: false, hasLiveActed: notActed, post }),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("never posts a restored, finished round either", () => {
    const post = vi.fn();
    renderHook(() =>
      useLiveScorePost({ score: 120, isFinished: true, hasLiveActed: notActed, post }),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("posts the live score once the player has acted", () => {
    const post = vi.fn();
    renderHook(() =>
      useLiveScorePost({ score: 55, isFinished: false, hasLiveActed: acted, post }),
    );
    expect(post).toHaveBeenCalledWith(55);
  });

  it("re-posts whenever the score changes (dedup is the poster's job)", () => {
    const post = vi.fn();
    const { rerender } = renderHook(
      ({ score }) => useLiveScorePost({ score, isFinished: false, hasLiveActed: acted, post }),
      { initialProps: { score: 55 } },
    );
    rerender({ score: 110 });
    expect(post).toHaveBeenNthCalledWith(1, 55);
    expect(post).toHaveBeenNthCalledWith(2, 110);
  });

  it("keeps posting after the round finishes, and opens nothing", () => {
    const post = vi.fn();
    const { rerender } = renderHook(
      ({ isFinished }) => useLiveScorePost({ score: 80, isFinished, hasLiveActed: acted, post }),
      { initialProps: { isFinished: false } },
    );
    rerender({ isFinished: true });

    expect(post).toHaveBeenLastCalledWith(80);
  });
});
