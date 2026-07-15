// useLiveScorePost.test.ts — the shared continuous-posting policy for the
// round games (Leksodromia, Leksoplegma). Verifies the three rules the two
// Boards used to copy verbatim: restored-untouched rounds never post, live
// scores post on every render (dedup lives in useScoreSubmission), and the
// leaderboard opens exactly once — after a delay — when the round finishes.

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLiveScorePost } from "@/hooks/useLiveScorePost";

const acted = () => true;
const notActed = () => false;

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("useLiveScorePost", () => {
  it("never posts when the player has not acted this session (restored round)", () => {
    const post = vi.fn();
    const onFinish = vi.fn();
    renderHook(() =>
      useLiveScorePost({ score: 120, isFinished: false, hasLiveActed: notActed, post, onFinish }),
    );
    expect(post).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("never opens the leaderboard for a restored, finished round", () => {
    const post = vi.fn();
    const onFinish = vi.fn();
    renderHook(() =>
      useLiveScorePost({ score: 120, isFinished: true, hasLiveActed: notActed, post, onFinish }),
    );
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(post).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("posts the live score once the player has acted", () => {
    const post = vi.fn();
    renderHook(() =>
      useLiveScorePost({ score: 55, isFinished: false, hasLiveActed: acted, post, onFinish: vi.fn() }),
    );
    expect(post).toHaveBeenCalledWith(55);
  });

  it("re-posts whenever the score changes (dedup is the poster's job)", () => {
    const post = vi.fn();
    const { rerender } = renderHook(
      ({ score }) =>
        useLiveScorePost({ score, isFinished: false, hasLiveActed: acted, post, onFinish: vi.fn() }),
      { initialProps: { score: 55 } },
    );
    rerender({ score: 110 });
    expect(post).toHaveBeenNthCalledWith(1, 55);
    expect(post).toHaveBeenNthCalledWith(2, 110);
  });

  it("opens the leaderboard once, after the delay, when the round finishes", () => {
    const onFinish = vi.fn();
    const { rerender } = renderHook(
      ({ isFinished }) =>
        useLiveScorePost({ score: 80, isFinished, hasLiveActed: acted, post: vi.fn(), onFinish }),
      { initialProps: { isFinished: false } },
    );
    expect(onFinish).not.toHaveBeenCalled();

    rerender({ isFinished: true });
    expect(onFinish).not.toHaveBeenCalled(); // waits out the delay
    act(() => { vi.advanceTimersByTime(1_500); });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("does not re-open the leaderboard on renders after the finish is handled", () => {
    const onFinish = vi.fn();
    const { rerender } = renderHook(
      ({ score }) =>
        useLiveScorePost({ score, isFinished: true, hasLiveActed: acted, post: vi.fn(), onFinish }),
      { initialProps: { score: 80 } },
    );
    act(() => { vi.advanceTimersByTime(1_500); });
    expect(onFinish).toHaveBeenCalledTimes(1);

    rerender({ score: 90 }); // a later change must not schedule a second open
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("honours a custom delay", () => {
    const onFinish = vi.fn();
    renderHook(() =>
      useLiveScorePost({ score: 10, isFinished: true, hasLiveActed: acted, post: vi.fn(), onFinish, delayMs: 3_000 }),
    );
    act(() => { vi.advanceTimersByTime(1_500); });
    expect(onFinish).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1_500); });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
