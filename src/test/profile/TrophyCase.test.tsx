// TrophyCase — the trophy grid on /profile.
//
// Renders the frozen catalog, lights earned one-shots, and lights per-tier chips of
// each tiered badge either when earned server-side OR when a live lifetime value
// crosses the threshold, plus an "X / N" progress line toward the next tier. Both
// live values (leksokipos_points for Συλλέκτης Πόντων, pangram_count for Κυνηγός
// Πανγκράμ) come from /api/profile/stats; earned ids from /api/achievements.

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrophyCase } from "@/components/profile/TrophyCase";
import { LEKSOKIPOS_ACHIEVEMENTS } from "@/games/leksokipos/lib/achievements";

afterEach(() => vi.restoreAllMocks());

/** The tile element wrapping a given achievement name. */
function tileFor(name: string): HTMLElement {
  return screen.getByText(name).closest("[data-testid='trophy-tile']") as HTMLElement;
}

/** The tier chip element for a given frozen tier id. */
function tierChip(tierId: string): HTMLElement {
  return screen.getByTestId(`tier-chip-${tierId}`);
}

/**
 * Route the fetch mock by URL: /api/achievements → { earned }, /api/profile/stats →
 * { leksokipos_points, pangram_count }. Both share the ok flag so an error case
 * fails both reads.
 */
function mockData({ earned = [] as string[], points = 0, pangrams = 0, ok = true } = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes("/api/profile/stats")
      ? { leksokipos_points: points, pangram_count: pangrams }
      : { earned };
    return Promise.resolve({ ok, json: async () => body } as Response);
  });
}

/** Back-compat shorthand for the earned-only cases. */
function mockEarned(ids: string[], ok = true) {
  return mockData({ earned: ids, ok });
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
    expect(tileFor("Σιδηρόδρομος")).toHaveAttribute("data-earned", "false");
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

  it("lights a points-tier chip when live points cross it, even if not earned server-side", async () => {
    mockData({ earned: [], points: 1500 }); // ≥ χάλκινο (1000), < ασημένιο (10000)
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tierChip("leksokipos-syllektis-ponton-chalkino")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-syllektis-ponton-asimenio")).toHaveAttribute("data-earned", "false");
  });

  it("lights a points-tier chip earned server-side even when the live points are lower", async () => {
    // Earned fact is authoritative; a lagging/low points read must not un-light it.
    mockData({ earned: ["leksokipos-syllektis-ponton-chalkino"], points: 0 });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tierChip("leksokipos-syllektis-ponton-chalkino")).toHaveAttribute("data-earned", "true"),
    );
  });

  it("shows X / N progress toward the next uncrossed points tier", async () => {
    mockData({ earned: [], points: 740 });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      // el-GR grouping: next threshold 1000 → "1.000"
      expect(screen.getByTestId("tier-progress-leksokipos-syllektis-ponton")).toHaveTextContent("740 / 1.000"),
    );
  });

  it("shows no progress line once every points tier is crossed", async () => {
    mockData({ earned: [], points: 30000 }); // past χρυσό (25000)
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tierChip("leksokipos-syllektis-ponton-chryso")).toHaveAttribute("data-earned", "true"),
    );
    expect(screen.queryByTestId("tier-progress-leksokipos-syllektis-ponton")).not.toBeInTheDocument();
  });

  // ── Pangram badge (B2): live source is pangram_count, its own progress denominator ──

  it("shows the pangram tiers with Greek tier words and thresholds (10 / 20 / 50)", () => {
    render(<TrophyCase />);
    expect(screen.getByText(/Χάλκινο · 10/)).toBeInTheDocument();
    expect(screen.getByText(/Ασημένιο · 20/)).toBeInTheDocument();
    expect(screen.getByText(/Χρυσό · 50/)).toBeInTheDocument();
  });

  it("lights a pangram-tier chip when the live pangram count crosses it", async () => {
    mockData({ earned: [], pangrams: 10 }); // ≥ χάλκινο (10), < ασημένιο (20)
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tierChip("leksokipos-kynigos-pangram-chalkino")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-kynigos-pangram-asimenio")).toHaveAttribute("data-earned", "false");
  });

  it("lights a pangram-tier chip earned server-side even when the live count is lower", async () => {
    mockData({ earned: ["leksokipos-kynigos-pangram-chalkino"], pangrams: 0 });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tierChip("leksokipos-kynigos-pangram-chalkino")).toHaveAttribute("data-earned", "true"),
    );
  });

  it("shows X / N progress toward the next uncrossed pangram tier", async () => {
    mockData({ earned: [], pangrams: 7 });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(screen.getByTestId("tier-progress-leksokipos-kynigos-pangram")).toHaveTextContent("7 / 10"),
    );
  });
});
