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

const STALE_PUZZLE: LeksokiposPuzzle = {
  ...BASE,
  id:   "2020-01-01-el",
  date: "2020-01-01",
};

const CUSTOM_STALE_PUZZLE: LeksokiposPuzzle = {
  ...BASE,
  id:   "custom-α-πιντεδ",
  date: "2020-01-01",
};

// ── Tests ───────────────────────────────────────────────────────────────────

afterEach(() => {
  replace.mockClear();
});

describe("useDayChange", () => {
  it("does not redirect when the puzzle is today's", () => {
    renderHook(() => useDayChange(TODAY_PUZZLE));
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to /leksokipos on mount when the puzzle date is in the past", () => {
    renderHook(() => useDayChange(STALE_PUZZLE));
    expect(replace).toHaveBeenCalledWith("/leksokipos");
  });

  it("does not redirect for custom puzzles even if the date is stale", () => {
    renderHook(() => useDayChange(CUSTOM_STALE_PUZZLE));
    expect(replace).not.toHaveBeenCalled();
  });

  it("uses router.replace (not push) so Back does not loop", () => {
    renderHook(() => useDayChange(STALE_PUZZLE));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("re-checks and redirects when the tab regains visibility", () => {
    // Mount on a stale puzzle clears, then fire visibilitychange to prove the
    // listener path also triggers the redirect.
    renderHook(() => useDayChange(STALE_PUZZLE));
    replace.mockClear();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(replace).toHaveBeenCalledWith("/leksokipos");
  });

  it("removes the visibilitychange listener on unmount", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useDayChange(TODAY_PUZZLE));
    unmount();
    expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});
