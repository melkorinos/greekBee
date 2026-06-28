// useDayChange.test.ts — tests the stale-day redirect for daily Leksokipos pages.

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useDayChange } from "@/games/leksokipos/hooks/useDayChange";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";

// ── Mocks ───────────────────────────────────────────────────────────────────

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

const BASE: LeksokiposPuzzle = {
  id:           `${TODAY}-el`,
  language:     "el",
  date:         TODAY,
  centerLetter: "α",
  outerLetters: ["π", "ι", "ν", "τ", "ε", "δ"],
  validWords:   ["αντι", "παιδ"],
};

const TODAY_PUZZLE: LeksokiposPuzzle = BASE;

const PAST_PUZZLE: LeksokiposPuzzle = {
  ...BASE,
  id:   "2020-01-01-el",
  date: "2020-01-01",
};

const CUSTOM_PAST_PUZZLE: LeksokiposPuzzle = {
  ...BASE,
  id:   "custom-α-πιντεδ",
  date: "2020-01-01",
};

// ── Tests ───────────────────────────────────────────────────────────────────

afterEach(() => {
  replace.mockClear();
  vi.useRealTimers();
});

describe("useDayChange — today's puzzle", () => {
  it("does not redirect on mount when the puzzle is today's", () => {
    renderHook(() => useDayChange(TODAY_PUZZLE));
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects via router.replace (not push) when the day rolls over", () => {
    const { unmount } = renderHook(() => useDayChange(TODAY_PUZZLE));

    // Simulate the day rolling over while the tab is open
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(tomorrow + "T12:00:00Z"));

    document.dispatchEvent(new Event("visibilitychange"));
    expect(replace).toHaveBeenCalledWith("/leksokipos");
    expect(replace).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("removes the visibilitychange listener on unmount", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useDayChange(TODAY_PUZZLE));
    unmount();
    expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});

describe("useDayChange — past puzzle (leaderboard navigation)", () => {
  // Regression: before the fix, check() fired on mount and redirected the player
  // back to today's game immediately after navigating to a past puzzle via the
  // leaderboard day strip. This made today's given-up state appear on all past days.

  it("does NOT redirect on mount for a past daily puzzle", () => {
    renderHook(() => useDayChange(PAST_PUZZLE));
    expect(replace).not.toHaveBeenCalled();
  });

  it("does NOT redirect via visibilitychange for a past puzzle", () => {
    renderHook(() => useDayChange(PAST_PUZZLE));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("useDayChange — custom puzzles", () => {
  it("does not redirect for custom puzzles even if the date is stale", () => {
    renderHook(() => useDayChange(CUSTOM_PAST_PUZZLE));
    expect(replace).not.toHaveBeenCalled();
  });
});
