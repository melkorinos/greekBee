// useAchievementSync.test.ts — the client glue that detects earned achievements
// at end-of-game and posts fresh ids. Detection itself is tested in achievements.test.ts;
// here we verify the gating (daily / god-mode / device) and the once-per-session dedup.

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const postAchievements = vi.fn();
vi.mock("@/games/leksokipos/sync", () => ({
  postAchievements: (...args: unknown[]) => postAchievements(...args),
}));

const { useAchievementSync } = await import("@/games/leksokipos/hooks/useAchievementSync");

import type { RankName } from "@/games/leksokipos/lib/ranking";

interface Props {
  isDaily:        boolean;
  isGodMode:      boolean;
  deviceId:       string;
  foundWords:     string[];
  validWordCount: number;
  rank:           RankName;
}

const BASE: Props = {
  isDaily:        true,
  isGodMode:      false,
  deviceId:       "device-1",
  foundWords:     ["γατα"],
  validWordCount: 20,
  rank:           "Θηρίο",
};

afterEach(() => { postAchievements.mockClear(); });

describe("useAchievementSync — posting", () => {
  it("posts the ids detected for the current snapshot", () => {
    renderHook(() => useAchievementSync({
      ...BASE,
      foundWords: ["γατα", "παρακολουθηση"], // 13 letters → sidirodromos
    }));
    expect(postAchievements).toHaveBeenCalledTimes(1);
    const arg = postAchievements.mock.calls[0][0];
    expect(arg.deviceUuid).toBe("device-1");
    expect(arg.achievementIds).toEqual(
      expect.arrayContaining(["leksokipos-first-daily", "leksokipos-sidirodromos"]),
    );
  });

  it("does not re-post an id already posted this session", () => {
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: ["γατα"] }, // first-daily
    });
    expect(postAchievements).toHaveBeenCalledTimes(1);
    postAchievements.mockClear();

    // Another word found, but no NEW achievement crosses — nothing to post.
    rerender({ ...BASE, foundWords: ["γατα", "σκυλος"] });
    expect(postAchievements).not.toHaveBeenCalled();
  });

  it("posts only the newly-crossed id when state grows into a new achievement", () => {
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: ["γατα"] }, // first-daily
    });
    postAchievements.mockClear();

    rerender({ ...BASE, foundWords: ["γατα", "παρακολουθηση"] }); // adds sidirodromos
    expect(postAchievements).toHaveBeenCalledTimes(1);
    expect(postAchievements.mock.calls[0][0].achievementIds).toEqual(["leksokipos-sidirodromos"]);
  });
});

describe("useAchievementSync — gating", () => {
  it("does nothing on a non-daily puzzle", () => {
    renderHook(() => useAchievementSync({ ...BASE, isDaily: false }));
    expect(postAchievements).not.toHaveBeenCalled();
  });

  it("does nothing in god mode", () => {
    renderHook(() => useAchievementSync({ ...BASE, isGodMode: true }));
    expect(postAchievements).not.toHaveBeenCalled();
  });

  it("does nothing without a device id", () => {
    renderHook(() => useAchievementSync({ ...BASE, deviceId: "" }));
    expect(postAchievements).not.toHaveBeenCalled();
  });
});
