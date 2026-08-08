// leaderboardModal.test.tsx — unit tests for GameLeaderboardModal, exercised
// through the leksokipos config row (the game with the play-link slots).
//
// Covers:
//   1. 7-day pill strip renders with the correct pills.
//   2. Today's pill is labelled "Σήμερα" and selected by default.
//   3. Clicking a past-day pill switches selectedDate and shows the play link.
//   4. No play link when today's pill is selected.
//   5. Display-name editor behaviour — linked vs unlinked.
//   6. Modal renders nothing when isOpen=false.
//   7. Profile section — idle, claiming (transfer code), linked, transferring.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { GameLeaderboardModal } from "@/components/shared/GameLeaderboardModal";
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

function renderModal(overrides: Partial<React.ComponentProps<typeof GameLeaderboardModal>> = {}) {
  const defaults: React.ComponentProps<typeof GameLeaderboardModal> = {
    gameId:              "leksokipos",
    isOpen:              true,
    today:               TODAY,
    defaultDate:         TODAY,
    dates:               RECENT_DATES,
    deviceId:            "test-device-id",
    displayName:         "",
    profileLinked:       false,
    onSaveName:          vi.fn(),
    onProfileCreate:     vi.fn().mockResolvedValue(undefined),
    onTransferGenerate:  vi.fn().mockResolvedValue("ABCDEF"),
    onTransferClaim:     vi.fn().mockResolvedValue(undefined),
    onDisconnect:        vi.fn(),
    onSignIn:            vi.fn().mockResolvedValue(undefined),
    onClose:             vi.fn(),
    ...overrides,
  };
  return render(<GameLeaderboardModal {...defaults} />);
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
  it("does NOT show any play link when today's pill is selected and defaultPuzzleId is today", () => {
    renderModal({ defaultDate: TODAY });
    expect(screen.queryByText(/Παίξε αυτό το παζλ/)).toBeNull();
    expect(screen.queryByText(/Παίξε το σημερινό παζλ/)).toBeNull();
  });

  it("shows play link when a past pill is clicked (player is on today's puzzle)", async () => {
    const past = RECENT_DATES[3];
    renderModal({ defaultDate: TODAY });
    fireEvent.click(screen.getByRole("button", { name: past }));
    const links = await screen.findAllByText(/Παίξε αυτό το παζλ/);
    expect(links.length).toBeGreaterThan(0);
  });

  it("play link href points to the correct past puzzle", async () => {
    const past = RECENT_DATES[3];
    renderModal({ defaultDate: TODAY });
    fireEvent.click(screen.getByRole("button", { name: past }));
    const links = await screen.findAllByText(/Παίξε αυτό το παζλ/);
    links.forEach((link) =>
      expect(link.closest("a")).toHaveAttribute("href", `/leksokipos?puzzle=${past}`)
    );
  });

  it("shows 'Παίξε το σημερινό παζλ' link when on a past puzzle and today pill is selected", async () => {
    const past = RECENT_DATES[3];
    renderModal({ defaultDate: past });
    // today pill is selected by default when defaultPuzzleId is in the strip,
    // but defaultPuzzleId=past means the strip opens on the past date.
    // Click the today pill to trigger the back-to-today link.
    fireEvent.click(screen.getByRole("button", { name: TODAY }));
    const links = await screen.findAllByText(/Παίξε το σημερινό παζλ/);
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) =>
      expect(link.closest("a")).toHaveAttribute("href", `/leksokipos?puzzle=${TODAY}`)
    );
  });

  it("does NOT show a play link when the past pill matching the current puzzle is selected", async () => {
    const past = RECENT_DATES[3];
    renderModal({ defaultDate: past });
    // The strip opens on the past date (defaultPuzzleId). No link should show for the current puzzle.
    expect(screen.queryByText(/Παίξε αυτό το παζλ/)).toBeNull();
    expect(screen.queryByText(/Παίξε το σημερινό παζλ/)).toBeNull();
  });
});

// ── Profile section — idle (unlinked) ────────────────────────────────────────

describe("LeaderboardModal — profile section (idle, unlinked)", () => {
  it("shows 'Σύνδεση με κωδικό' and 'Αποσύνδεση' when not linked", () => {
    renderModal({ profileLinked: false });
    expect(screen.getByText("Σύνδεση με κωδικό")).toBeInTheDocument();
    expect(screen.getByText("Αποσύνδεση")).toBeInTheDocument();
  });

  it("does NOT show a separate 'Δημιουργία προφίλ' button (creation is via name editor)", () => {
    renderModal({ profileLinked: false });
    expect(screen.queryByText("Δημιουργία προφίλ")).toBeNull();
  });

  it("clicking 'Σύνδεση με κωδικό' shows the transfer-code input", async () => {
    renderModal({ profileLinked: false });
    await userEvent.click(screen.getByText("Σύνδεση με κωδικό"));
    expect(screen.getByPlaceholderText(/Κωδικός μεταφοράς/)).toBeInTheDocument();
  });

  it("clicking 'Αποσύνδεση' shows confirmation row", async () => {
    renderModal({ profileLinked: false });
    await userEvent.click(screen.getByText("Αποσύνδεση"));
    expect(screen.getByTestId("btn-disconnect-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("btn-disconnect-cancel")).toBeInTheDocument();
  });

  it("'Άκυρο' in disconnect confirmation returns to idle without calling onDisconnect", async () => {
    const onDisconnect = vi.fn();
    renderModal({ profileLinked: false, onDisconnect });
    await userEvent.click(screen.getByText("Αποσύνδεση"));
    await userEvent.click(screen.getByTestId("btn-disconnect-cancel"));
    expect(onDisconnect).not.toHaveBeenCalled();
    expect(screen.getByText("Σύνδεση με κωδικό")).toBeInTheDocument();
  });

  it("confirming disconnect calls onDisconnect", async () => {
    const onDisconnect = vi.fn();
    renderModal({ profileLinked: false, onDisconnect });
    await userEvent.click(screen.getByText("Αποσύνδεση"));
    await userEvent.click(screen.getByTestId("btn-disconnect-confirm"));
    expect(onDisconnect).toHaveBeenCalledOnce();
  });
});

// ── Transfer code claim flow ──────────────────────────────────────────────────

describe("LeaderboardModal — transfer code claim flow", () => {
  it("'Άκυρο' in claiming mode returns to idle", async () => {
    renderModal({ profileLinked: false });
    await userEvent.click(screen.getByText("Σύνδεση με κωδικό"));
    await userEvent.click(screen.getByText("Άκυρο"));
    expect(screen.getByText("Σύνδεση με κωδικό")).toBeInTheDocument();
  });

  it("entering a 6-char code and clicking 'Σύνδεση' calls onTransferClaim", async () => {
    const onTransferClaim = vi.fn().mockResolvedValue(undefined);
    renderModal({ profileLinked: false, onTransferClaim });
    await userEvent.click(screen.getByText("Σύνδεση με κωδικό"));
    await userEvent.type(screen.getByPlaceholderText(/Κωδικός μεταφοράς/), "ABCDEF");
    await userEvent.click(screen.getByRole("button", { name: "Σύνδεση" }));
    expect(onTransferClaim).toHaveBeenCalledWith("ABCDEF");
  });

  it("shows an error message when onTransferClaim rejects", async () => {
    const onTransferClaim = vi.fn().mockRejectedValue(new Error("Άκυρος κωδικός"));
    renderModal({ profileLinked: false, onTransferClaim });
    await userEvent.click(screen.getByText("Σύνδεση με κωδικό"));
    await userEvent.type(screen.getByPlaceholderText(/Κωδικός μεταφοράς/), "XXXXXX");
    await userEvent.click(screen.getByRole("button", { name: "Σύνδεση" }));
    expect(await screen.findByText("Άκυρος κωδικός")).toBeInTheDocument();
  });
});

// ── Profile section — linked ──────────────────────────────────────────────────

describe("LeaderboardModal — profile section (linked)", () => {
  it("shows the linked name when profileLinked=true", () => {
    renderModal({ profileLinked: true, displayName: "Νίκος" });
    expect(screen.getByText(/Νίκος/)).toBeInTheDocument();
    expect(screen.getByText("Αποσύνδεση")).toBeInTheDocument();
  });

  it("shows 'Ανώνυμος' when profileLinked=true but displayName is empty", () => {
    renderModal({ profileLinked: true, displayName: "" });
    expect(screen.getByText(/Ανώνυμος/)).toBeInTheDocument();
  });

  it("shows 'Μεταφορά' button when linked", () => {
    renderModal({ profileLinked: true, displayName: "Νίκος" });
    expect(screen.getByText(/μεταφορά/i)).toBeInTheDocument();
  });

  it("clicking 'Μεταφορά' calls onTransferGenerate and shows the generated code", async () => {
    const onTransferGenerate = vi.fn().mockResolvedValue("XYZ123");
    renderModal({ profileLinked: true, displayName: "Νίκος", onTransferGenerate });
    await userEvent.click(screen.getByText(/μεταφορά/i));
    expect(onTransferGenerate).toHaveBeenCalledOnce();
    expect(await screen.findByText("XYZ123")).toBeInTheDocument();
  });

  it("clicking 'Αποσύνδεση' shows confirmation row, not immediately disconnecting", async () => {
    const onDisconnect = vi.fn();
    renderModal({ profileLinked: true, displayName: "Νίκος", onDisconnect });
    await userEvent.click(screen.getByText("Αποσύνδεση"));
    expect(onDisconnect).not.toHaveBeenCalled();
    expect(screen.getByTestId("btn-disconnect-confirm")).toBeInTheDocument();
  });

  it("calls onDisconnect after confirming 'Ναι' in the confirmation row", async () => {
    const onDisconnect = vi.fn();
    renderModal({ profileLinked: true, displayName: "Νίκος", onDisconnect });
    await userEvent.click(screen.getByText("Αποσύνδεση"));
    await userEvent.click(screen.getByTestId("btn-disconnect-confirm"));
    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("'Άκυρο' in disconnect confirmation keeps the linked state", async () => {
    const onDisconnect = vi.fn();
    renderModal({ profileLinked: true, displayName: "Νίκος", onDisconnect });
    await userEvent.click(screen.getByText("Αποσύνδεση"));
    await userEvent.click(screen.getByTestId("btn-disconnect-cancel"));
    expect(onDisconnect).not.toHaveBeenCalled();
    expect(screen.getByText(/Νίκος/)).toBeInTheDocument();
  });

  it("shows the name editor when profileLinked=true (name changes always allowed)", () => {
    renderModal({ profileLinked: true, displayName: "Νίκος" });
    expect(screen.getByPlaceholderText("Ανώνυμος")).toBeInTheDocument();
  });
});

// ── Profile create flow (triggered from name editor when unlinked) ────────────

describe("LeaderboardModal — profile create flow", () => {
  it("typing a name and saving when unlinked calls onProfileCreate", async () => {
    const onProfileCreate = vi.fn().mockResolvedValue(undefined);
    renderModal({ profileLinked: false, displayName: "", onProfileCreate });
    await userEvent.type(screen.getByPlaceholderText("Ανώνυμος"), "Μαρία");
    await userEvent.click(screen.getByRole("button", { name: "Αποθήκευση" }));
    expect(onProfileCreate).toHaveBeenCalledWith("Μαρία");
  });

  it("shows error in profile section when onProfileCreate throws", async () => {
    const onProfileCreate = vi.fn().mockRejectedValue(new Error("fail"));
    renderModal({ profileLinked: false, displayName: "", onProfileCreate });
    await userEvent.type(screen.getByPlaceholderText("Ανώνυμος"), "Μαρία");
    await userEvent.click(screen.getByRole("button", { name: "Αποθήκευση" }));
    expect(await screen.findByText(/σφάλμα/i)).toBeInTheDocument();
  });
});

// ── Display name editor ───────────────────────────────────────────────────────

describe("LeaderboardModal — display name editor (linked)", () => {
  it("calls onSaveName with trimmed value when Save is clicked while linked", async () => {
    const onSaveName = vi.fn();
    renderModal({ displayName: "Άννα", profileLinked: true, onSaveName });
    const input = screen.getByPlaceholderText("Ανώνυμος");
    await userEvent.clear(input);
    await userEvent.type(input, "  Βάσος  ");
    await userEvent.click(screen.getByRole("button", { name: "Αποθήκευση" }));
    expect(onSaveName).toHaveBeenCalledWith("Βάσος");
  });

  it("shows checkmark and is disabled when name unchanged while linked", () => {
    renderModal({ displayName: "Άννα", profileLinked: true });
    const btn = screen.getByRole("button", { name: "✓" });
    expect(btn).toBeDisabled();
  });

  it("pressing Enter in the name field triggers save when dirty (linked)", async () => {
    const onSaveName = vi.fn();
    renderModal({ displayName: "Άννα", profileLinked: true, onSaveName });
    const input = screen.getByPlaceholderText("Ανώνυμος");
    await userEvent.clear(input);
    await userEvent.type(input, "Βάσος{Enter}");
    expect(onSaveName).toHaveBeenCalledWith("Βάσος");
  });
});

describe("LeaderboardModal — display name editor (unlinked)", () => {
  it("save button shows 'Αποθήκευση' and is always enabled when not linked", () => {
    renderModal({ displayName: "Άννα", profileLinked: false });
    const btn = screen.getByRole("button", { name: "Αποθήκευση" });
    expect(btn).toBeEnabled();
  });

  it("save button is enabled even when name is unchanged while unlinked", () => {
    renderModal({ displayName: "Άννα", profileLinked: false });
    expect(screen.getByRole("button", { name: "Αποθήκευση" })).toBeEnabled();
  });
});
