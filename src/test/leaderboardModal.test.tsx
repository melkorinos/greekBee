// leaderboardModal.test.tsx — unit tests for LeaderboardModal.
//
// Covers:
//   1. 7-day pill strip renders with the correct pills.
//   2. Today's pill is labelled "Σήμερα" and selected by default.
//   3. Clicking a past-day pill switches selectedDate and shows the play link.
//   4. No play link when today's pill is selected.
//   5. Display-name save button calls onSaveName with the trimmed value.
//   6. Modal renders nothing when isOpen=false.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { LeaderboardModal } from "@/components/spelling-bee/LeaderboardModal";
import userEvent from "@testing-library/user-event";

// ── Mock useLeaderboard ───────────────────────────────────────────────────────

vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: () => ({
    data: { top20: [], playerRow: null },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

/** Build a recentDates array: today + (n-1) past days, newest-first. */
function makeRecentDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => pastDate(i));
}

const RECENT_DATES = makeRecentDates(7);

function renderModal(overrides: Partial<React.ComponentProps<typeof LeaderboardModal>> = {}) {
  const defaults: React.ComponentProps<typeof LeaderboardModal> = {
    isOpen:          true,
    defaultPuzzleId: TODAY,
    recentDates:     RECENT_DATES,
    deviceId:        "test-device-id",
    displayName:     "",
    onSaveName:      vi.fn(),
    onClose:         vi.fn(),
    ...overrides,
  };
  return render(<LeaderboardModal {...defaults} />);
}

// ── Closed modal ──────────────────────────────────────────────────────────────

describe("LeaderboardModal — closed state", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });
});

// ── Day strip ─────────────────────────────────────────────────────────────────

describe("LeaderboardModal — day strip", () => {
  it("renders 7 pill buttons", () => {
    renderModal();
    // Each pill has aria-label = the date string (YYYY-MM-DD)
    RECENT_DATES.forEach((date) => {
      expect(screen.getByRole("button", { name: date })).toBeInTheDocument();
    });
  });

  it("today's pill is labelled 'Σήμερα'", () => {
    renderModal();
    const todayPill = screen.getByRole("button", { name: TODAY });
    expect(todayPill).toHaveTextContent("Σήμερα");
  });

  it("today's pill is initially selected (aria-pressed=true)", () => {
    renderModal();
    const todayPill = screen.getByRole("button", { name: TODAY });
    expect(todayPill).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking a past pill marks it as selected and deselects today", () => {
    renderModal();
    const pastPill = screen.getByRole("button", { name: RECENT_DATES[3] });
    fireEvent.click(pastPill);
    expect(pastPill).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: TODAY })).toHaveAttribute("aria-pressed", "false");
  });
});

// ── "Παίξε αυτό το παζλ" play link ───────────────────────────────────────────

describe("LeaderboardModal — play link", () => {
  it("does NOT show play link when today's pill is selected", () => {
    renderModal();
    expect(screen.queryByText(/Παίξε αυτό το παζλ/)).toBeNull();
  });

  it("shows play link when a past pill is clicked", async () => {
    const past = RECENT_DATES[3];
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: past }));
    const links = await screen.findAllByText(/Παίξε αυτό το παζλ/);
    expect(links.length).toBeGreaterThan(0);
  });

  it("play link href points to the correct past puzzle", async () => {
    const past = RECENT_DATES[3];
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: past }));
    const links = await screen.findAllByText(/Παίξε αυτό το παζλ/);
    links.forEach((link) =>
      expect(link.closest("a")).toHaveAttribute("href", `/spelling-bee?puzzle=${past}`)
    );
  });
});

// ── Display name editor ───────────────────────────────────────────────────────

describe("LeaderboardModal — display name", () => {
  it("calls onSaveName with trimmed value when Save is clicked", async () => {
    const onSaveName = vi.fn();
    renderModal({ displayName: "", onSaveName });
    const input = screen.getByPlaceholderText("Ανώνυμος");
    await userEvent.type(input, "  Άννα  ");
    await userEvent.click(screen.getByRole("button", { name: "Αποθήκευση" }));
    expect(onSaveName).toHaveBeenCalledWith("Άννα");
  });

  it("shows checkmark (not Save text) when name matches saved displayName", () => {
    renderModal({ displayName: "Άννα" });
    expect(screen.getByRole("button", { name: "✓" })).toBeInTheDocument();
  });

  it("save button is disabled when name is unchanged", () => {
    renderModal({ displayName: "Άννα" });
    const btn = screen.getByRole("button", { name: "✓" });
    expect(btn).toBeDisabled();
  });

  it("pressing Enter in the name field triggers save when dirty", async () => {
    const onSaveName = vi.fn();
    renderModal({ displayName: "", onSaveName });
    const input = screen.getByPlaceholderText("Ανώνυμος");
    await userEvent.type(input, "Βάσος{Enter}");
    expect(onSaveName).toHaveBeenCalledWith("Βάσος");
  });
});
