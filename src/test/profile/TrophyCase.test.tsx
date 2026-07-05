// TrophyCase — the locked trophy grid on /profile.
//
// v1 renders every catalog entry greyed/locked (no earned state yet). Tiered
// badges also show their tier thresholds. Detection lands with the achievements
// epic; here we only verify the display surface over the frozen catalog.

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrophyCase } from "@/components/profile/TrophyCase";
import { LEKSOKIPOS_ACHIEVEMENTS } from "@/games/leksokipos/lib/achievements";

afterEach(() => vi.restoreAllMocks());

/** The tile element wrapping a given achievement name. */
function tileFor(name: string): HTMLElement {
  return screen.getByText(name).closest("[data-testid='trophy-tile']") as HTMLElement;
}

function mockEarned(ids: string[], ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    json: async () => ({ earned: ids }),
  } as Response);
}

describe("TrophyCase", () => {
  it("renders one tile per catalog entry, with name and hint", () => {
    render(<TrophyCase deviceId="" />);
    expect(screen.getAllByTestId("trophy-tile")).toHaveLength(LEKSOKIPOS_ACHIEVEMENTS.length);
    expect(screen.getByText("Πρώτα Βήματα")).toBeInTheDocument();
    expect(screen.getByText("Παίξε το πρώτο σου ημερήσιο παζλ.")).toBeInTheDocument();
  });

  it("shows tier rows with Greek tier words and formatted thresholds for tiered badges", () => {
    render(<TrophyCase />);
    // Συλλέκτης Πόντων tiers: 1.000 / 10.000 / 25.000 (el-GR grouping)
    expect(screen.getByText(/Χάλκινο · 1\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Ασημένιο · 10\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Χρυσό · 25\.000/)).toBeInTheDocument();
  });

  it("shows a beta notice that trophies may reset on launch", () => {
    render(<TrophyCase />);
    const notice = screen.getByTestId("trophy-beta-notice");
    expect(notice).toHaveTextContent(/beta/i);
    expect(notice).toHaveTextContent("μηδενιστούν");
  });

  it("lights tiles whose achievement id has been earned, leaving the rest locked", async () => {
    mockEarned(["leksokipos-first-daily"]);
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tileFor("Πρώτα Βήματα")).toHaveAttribute("data-earned", "true"),
    );
    expect(tileFor("Τζιμάνι")).toHaveAttribute("data-earned", "false");
  });

  it("keeps every tile locked when the device has earned nothing", async () => {
    mockEarned([]);
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(screen.getAllByTestId("trophy-tile").length).toBeGreaterThan(0),
    );
    for (const tile of screen.getAllByTestId("trophy-tile")) {
      expect(tile).toHaveAttribute("data-earned", "false");
    }
  });

  it("keeps every tile locked on fetch error, without crashing", async () => {
    mockEarned([], false); // ok: false
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(screen.getAllByTestId("trophy-tile").length).toBeGreaterThan(0),
    );
    expect(tileFor("Πρώτα Βήματα")).toHaveAttribute("data-earned", "false");
  });

  it("does not fetch, and leaves all tiles locked, without a device id", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<TrophyCase deviceId="" />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(tileFor("Πρώτα Βήματα")).toHaveAttribute("data-earned", "false");
  });
});
