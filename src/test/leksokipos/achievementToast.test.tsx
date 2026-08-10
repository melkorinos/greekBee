// achievementToast.test.tsx — the in-game unlock toast (a single freshly-earned badge).
//
// Renders the badge's drawn mark and copy, auto-dismisses after its lifetime, and
// dismisses on the close button. Which badges reach it (suppressing already-earned
// ones) is the hook's job, covered in useAchievementSync.test.ts.
//
// Every fixture is built through describeAchievement — the SAME resolver
// useAchievementSync uses — rather than a hand-written object. A hand-written toast
// is a claim about a contract; this way the test cannot drift from the real shape,
// and it exercises the thing that actually matters: what the toast is handed is a
// TIER id, and the drawing hangs off the base badge.

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AchievementToast } from "@/components/leksokipos/AchievementToast";
import {
  LEKSOKIPOS_ACHIEVEMENTS,
  describeAchievement,
  type EarnedToast,
} from "@/games/leksokipos/lib/achievements";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** A real freshly-earned badge, resolved exactly as the sync lane resolves it. */
function toastFor(earnedId: string): EarnedToast {
  const display = describeAchievement(earnedId);
  if (!display) throw new Error(`no catalog entry for ${earnedId}`);
  return { id: earnedId, ...display };
}

/** The catalog's own art for a base badge id. */
function markPathOf(baseId: string): string {
  return LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === baseId)!.mark.path;
}

const SILVER_POINTS = "leksokipos-syllektis-ponton-asimenio";

describe("AchievementToast", () => {
  it("shows the earned badge's name and Greek tier label", () => {
    render(<AchievementToast badge={toastFor(SILVER_POINTS)} onDismiss={() => {}} />);
    const toast = screen.getByTestId("achievement-toast");
    expect(toast).toHaveTextContent("Συλλέκτης Πόντων");
    expect(toast).toHaveTextContent("Ασημένιο");
    expect(toast).toHaveAttribute("role", "status");
  });

  it("draws the earned badge's own mark instead of one trophy for everything", () => {
    // Was a fixed 🏆 on every unlock, so five different badges looked identical at
    // the moment they were won.
    render(<AchievementToast badge={toastFor(SILVER_POINTS)} onDismiss={() => {}} />);
    expect(screen.getByTestId("badge-mark").querySelector("path")).toHaveAttribute(
      "d",
      markPathOf("leksokipos-syllektis-ponton"),
    );
  });

  it("frames the mark at the tier just earned, never neutral", () => {
    // A neutral frame is what LOCKED looks like — the one thing an unlock must not
    // resemble. The toast is handed a TIER id, so the tier has to survive the trip.
    render(<AchievementToast badge={toastFor(SILVER_POINTS)} onDismiss={() => {}} />);
    const badge = screen.getByTestId("badge-mark");
    expect(badge).toHaveAttribute("data-tier", "asimenio");
    expect(badge).not.toHaveAttribute("data-locked");
  });

  it("draws the ladder's single mark for a frozen word-length rung", () => {
    // The word-length rungs are frozen one-shot ids that predate the ladder, so they
    // do not follow the `${base}-${tier}` shape the other four badges use.
    render(<AchievementToast badge={toastFor("leksokipos-word-13")} onDismiss={() => {}} />);
    expect(screen.getByTestId("badge-mark").querySelector("path")).toHaveAttribute(
      "d",
      markPathOf("leksokipos-makrylexis"),
    );
    expect(screen.getByTestId("badge-mark")).toHaveAttribute("data-tier", "diamanti");
  });

  it("auto-dismisses after its lifetime elapses", () => {
    const onDismiss = vi.fn();
    render(<AchievementToast badge={toastFor(SILVER_POINTS)} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(6000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses when the close button is clicked", () => {
    const onDismiss = vi.fn();
    render(<AchievementToast badge={toastFor(SILVER_POINTS)} onDismiss={onDismiss} />);
    act(() => { screen.getByRole("button", { name: "Κλείσιμο" }).click(); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
