// leaderboardModal.test.tsx — unit tests for LeaderboardModal.
//
// Covers:
//   1. Date picker has a `max` attribute capped at today (no future dates).
//   2. "Παίξε αυτό το παζλ" link appears for past dates but NOT for future dates.
//   3. Display-name save button calls onSaveName with the trimmed value.
//   4. Modal renders nothing when isOpen=false.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { LeaderboardModal } from "@/components/spelling-bee/LeaderboardModal";
import userEvent from "@testing-library/user-event";

// ── Mock useLeaderboard ───────────────────────────────────────────────────────
// We don't want real network calls in unit tests.

vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: () => ({
    data: { top20: [], playerRow: null },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

// A date we know is in the past relative to today
function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

// A date in the future
function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

function renderModal(overrides: Partial<React.ComponentProps<typeof LeaderboardModal>> = {}) {
  const defaults: React.ComponentProps<typeof LeaderboardModal> = {
    isOpen:          true,
    defaultPuzzleId: TODAY,
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

// ── Date picker constraints ───────────────────────────────────────────────────

describe("LeaderboardModal — date picker constraints", () => {
  it("date input has max set to today's date", () => {
    renderModal();
    const input = screen.getByDisplayValue(TODAY);
    expect(input).toHaveAttribute("max", TODAY);
  });

  it("date input has no min attribute (all past dates allowed)", () => {
    renderModal();
    const input = screen.getByDisplayValue(TODAY);
    expect(input).not.toHaveAttribute("min");
  });
});

// ── "Παίξε αυτό το παζλ" play link ───────────────────────────────────────────
//
// The play link appears when:
//   - selectedDate !== defaultPuzzleId  (i.e. navigated away from the current puzzle)
//   - selectedDate <= today             (past/today only — no future)
//
// In practice: modal opens with today's puzzle as defaultPuzzleId; user changes the
// date picker to a past date → link appears.  Selecting a future date → no link.

describe("LeaderboardModal — play link", () => {
  it("does NOT show play link when viewing the current (today's) puzzle", () => {
    renderModal({ defaultPuzzleId: TODAY });
    expect(screen.queryByText(/Παίξε αυτό το παζλ/)).toBeNull();
  });

  it("shows play link when the user navigates to a past date", async () => {
    const past = pastDate(3);
    renderModal({ defaultPuzzleId: TODAY });
    const dateInput = screen.getByDisplayValue(TODAY);
    fireEvent.change(dateInput, { target: { value: past } });
    const links = await screen.findAllByText(/Παίξε αυτό το παζλ/);
    expect(links.length).toBeGreaterThan(0);
  });

  it("play link points to the correct past puzzle URL", async () => {
    const past = pastDate(3);
    renderModal({ defaultPuzzleId: TODAY });
    const dateInput = screen.getByDisplayValue(TODAY);
    fireEvent.change(dateInput, { target: { value: past } });
    const links = await screen.findAllByText(/Παίξε αυτό το παζλ/);
    // All rendered links should point to the correct URL
    links.forEach((link) =>
      expect(link.closest("a")).toHaveAttribute("href", `/spelling-bee?puzzle=${past}`)
    );
  });

  it("does NOT show play link when navigating to a future date", async () => {
    const future = futureDate(2);
    renderModal({ defaultPuzzleId: TODAY });
    const dateInput = screen.getByDisplayValue(TODAY);
    fireEvent.change(dateInput, { target: { value: future } });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/Παίξε αυτό το παζλ/)).toBeNull();
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
    // nameDirty is false → button label is "✓"
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
