// achievementToast.test.tsx — the in-game unlock toast (a single freshly-earned badge).
//
// Renders the badge copy, auto-dismisses after its lifetime, and dismisses on the
// close button. Which badges reach it (suppressing already-earned ones) is the
// hook's job, covered in useAchievementSync.test.ts.

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AchievementToast } from "@/components/leksokipos/AchievementToast";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("AchievementToast", () => {
  it("shows a one-shot badge as an unlock message with its name", () => {
    render(<AchievementToast badge={{ id: "leksokipos-first-daily", name: "Πρώτα Βήματα" }} onDismiss={() => {}} />);
    const toast = screen.getByTestId("achievement-toast");
    expect(toast).toHaveTextContent("Πρώτα Βήματα");
    expect(toast).toHaveAttribute("role", "status");
  });

  it("shows a tier badge with its Greek tier label", () => {
    render(
      <AchievementToast
        badge={{ id: "leksokipos-syllektis-ponton-asimenio", name: "Συλλέκτης Πόντων", tierLabel: "Ασημένιο" }}
        onDismiss={() => {}}
      />,
    );
    const toast = screen.getByTestId("achievement-toast");
    expect(toast).toHaveTextContent("Συλλέκτης Πόντων");
    expect(toast).toHaveTextContent("Ασημένιο");
  });

  it("auto-dismisses after its lifetime elapses", () => {
    const onDismiss = vi.fn();
    render(<AchievementToast badge={{ id: "leksokipos-first-daily", name: "Πρώτα Βήματα" }} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(6000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses when the close button is clicked", () => {
    const onDismiss = vi.fn();
    render(<AchievementToast badge={{ id: "leksokipos-first-daily", name: "Πρώτα Βήματα" }} onDismiss={onDismiss} />);
    act(() => { screen.getByRole("button", { name: "Κλείσιμο" }).click(); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
