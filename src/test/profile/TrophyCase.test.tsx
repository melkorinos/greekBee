// TrophyCase — the trophy grid on /profile.
//
// Renders the frozen catalog, lights earned one-shots, and lights per-tier chips of
// each tiered badge either when earned server-side OR when a live lifetime value
// crosses the threshold, plus an "X / N" progress line toward the next tier. Both
// live values (leksokipos_points for Συλλέκτης Πόντων, pangram_count for Κυνηγός
// Πανγκράμ) come from /api/profile/stats; earned ids from /api/achievements.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrophyCase } from "@/components/profile/TrophyCase";
import { GAME_REGISTRY } from "@/config/games";
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
 * the four live lifetime values, one per tiered badge that has one. Both share the
 * ok flag so an error case fails both reads.
 */
function mockData({
  earned = [] as string[],
  points = 0,
  pangrams = 0,
  topRank = 0,
  tzimani = 0,
  selected = null as string | null,
  ok = true,
} = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    let body: unknown = { earned };
    if (url.includes("/api/profile/stats")) {
      body = {
        leksokipos_points: points,
        pangram_count:     pangrams,
        top_rank_count:    topRank,
        tzimani_count:     tzimani,
      };
    } else if (url.includes("/api/profile/badge")) body = { selected_badge_id: selected };
    return Promise.resolve({ ok, json: async () => body } as Response);
  });
}

/** The most recent POST to /api/profile/badge, parsed, or null if none fired. */
function lastBadgePost(spy: ReturnType<typeof vi.spyOn>): { device_uuid: string; selected_badge_id: string | null } | null {
  const calls = spy.mock.calls as [RequestInfo | URL, RequestInit?][];
  const post = [...calls].reverse().find(
    ([url, init]) => String(url).includes("/api/profile/badge") && init?.method === "POST",
  );
  return post ? JSON.parse(String(post[1]!.body)) : null;
}

/** Back-compat shorthand for the earned-only cases. */
function mockEarned(ids: string[], ok = true) {
  return mockData({ earned: ids, ok });
}

describe("TrophyCase", () => {
  it("renders one tile per catalog entry, with name and hint", () => {
    render(<TrophyCase deviceId="" />);
    expect(screen.getAllByTestId("trophy-tile")).toHaveLength(LEKSOKIPOS_ACHIEVEMENTS.length);
    expect(screen.getByText("Τζιμάνι")).toBeInTheDocument();
    expect(screen.getByText("Βρες το 70% των λέξεων σε ημερήσια παζλ.")).toBeInTheDocument();
  });

  it("renders the five rebuilt badges and neither retired one", () => {
    render(<TrophyCase deviceId="" />);
    for (const name of ["Στην Κορυφή", "Μακρυλέξης", "Τζιμάνι", "Κυνηγός Πανγκράμ", "Συλλέκτης Πόντων"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText("Πρώτα Βήματα")).not.toBeInTheDocument();
    expect(screen.queryByText("Θεριστής")).not.toBeInTheDocument();
  });

  it("shows tier rows with Greek tier words and formatted thresholds for tiered badges", () => {
    render(<TrophyCase />);
    // Συλλέκτης Πόντων tiers: 1.000 / 10.000 / 25.000 (el-GR grouping)
    expect(screen.getByText(/Χάλκινο · 1\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Ασημένιο · 10\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Χρυσό · 25\.000/)).toBeInTheDocument();
  });

  it("shows a beta notice that names the first game and warns trophies may reset on launch", () => {
    render(<TrophyCase />);
    const notice = screen.getByTestId("trophy-beta-notice");
    expect(notice).toHaveTextContent(/beta/i);
    expect(notice).toHaveTextContent("μηδενιστούν");
    expect(notice).toHaveTextContent(GAME_REGISTRY.leksokipos.label);
  });

  it("lights tiles whose achievement id has been earned, leaving the rest locked", async () => {
    mockEarned(["leksokipos-stin-korifi-chalkino"]);
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-earned", "true"),
    );
    expect(tileFor("Μακρυλέξης")).toHaveAttribute("data-earned", "false");
  });

  it("shows an earned tile's own glyph instead of the generic trophy", async () => {
    mockEarned(["leksokipos-stin-korifi-chalkino"]);
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-earned", "true"),
    );
    expect(tileFor("Στην Κορυφή")).toHaveTextContent("👑");
  });

  it("shows the lock glyph on a tile the device has not earned", () => {
    render(<TrophyCase deviceId="" />);
    expect(tileFor("Μακρυλέξης")).toHaveTextContent("🔒");
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
    expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-earned", "false");
  });

  it("does not fetch, and leaves all tiles locked, without a device id", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<TrophyCase deviceId="" />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-earned", "false");
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

  it("shows the pangram tiers with Greek tier words and thresholds (25 / 60 / 150)", () => {
    render(<TrophyCase />);
    expect(screen.getByText(/Χάλκινο · 25/)).toBeInTheDocument();
    expect(screen.getByText(/Ασημένιο · 60/)).toBeInTheDocument();
    expect(screen.getByText(/Χρυσό · 150/)).toBeInTheDocument();
  });

  it("lights a pangram-tier chip when the live pangram count crosses it", async () => {
    mockData({ earned: [], pangrams: 25 }); // ≥ χάλκινο (25), < ασημένιο (60)
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
      expect(screen.getByTestId("tier-progress-leksokipos-kynigos-pangram")).toHaveTextContent("7 / 25"),
    );
  });

  // ── The two day-count badges (TICKET-02): live sources are the milestone counts ──

  it("lights a Στην Κορυφή chip from the live top-rank day count", async () => {
    mockData({ earned: [], topRank: 10 }); // ≥ ασημένιο (10), < χρυσό (25)
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tierChip("leksokipos-stin-korifi-asimenio")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-stin-korifi-chryso")).toHaveAttribute("data-earned", "false");
  });

  it("shows X / N progress toward the next uncrossed Στην Κορυφή tier", async () => {
    mockData({ earned: [], topRank: 3 });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(screen.getByTestId("tier-progress-leksokipos-stin-korifi")).toHaveTextContent("3 / 10"),
    );
  });

  it("lights a Τζιμάνι chip from the live qualifying-day count", async () => {
    mockData({ earned: [], tzimani: 5 }); // ≥ ασημένιο (5), < χρυσό (10)
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tierChip("leksokipos-tzimani-asimenio")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-tzimani-chryso")).toHaveAttribute("data-earned", "false");
  });

  it("shows X / N progress toward the next uncrossed Τζιμάνι tier", async () => {
    mockData({ earned: [], tzimani: 2 });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(screen.getByTestId("tier-progress-leksokipos-tzimani")).toHaveTextContent("2 / 5"),
    );
  });

  it("keeps each badge's live value on its own tile", async () => {
    // Four badges now read four different numbers off one stats response; crossing
    // the wires would light a tier the player has not reached.
    mockData({ earned: [], points: 0, pangrams: 0, topRank: 25, tzimani: 0 });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tierChip("leksokipos-stin-korifi-chryso")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-tzimani-chalkino")).toHaveAttribute("data-earned", "false");
    expect(tierChip("leksokipos-kynigos-pangram-chalkino")).toHaveAttribute("data-earned", "false");
    expect(tierChip("leksokipos-syllektis-ponton-chalkino")).toHaveAttribute("data-earned", "false");
  });

  // ── Tier medals on the tile: a top-tier holder must not look like a bronze one ──

  it("shows the medal of the highest earned tier on a tiered tile", async () => {
    mockData({ earned: ["leksokipos-kynigos-pangram-chryso"] });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(screen.getByTestId("tile-medal-leksokipos-kynigos-pangram")).toHaveTextContent("🥇"),
    );
  });

  it("shows the bronze medal when only the lowest tier is held", async () => {
    mockData({ earned: ["leksokipos-kynigos-pangram-chalkino"] });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(screen.getByTestId("tile-medal-leksokipos-kynigos-pangram")).toHaveTextContent("🥉"),
    );
  });

  it("shows a medal for a tier reached only by the live value", async () => {
    mockData({ earned: [], points: 30000 }); // past χρυσό, nothing recorded server-side
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(screen.getByTestId("tile-medal-leksokipos-syllektis-ponton")).toHaveTextContent("🥇"),
    );
  });

  it("shows no medal on a tile whose badge has no tier held", async () => {
    mockData({ earned: ["leksokipos-stin-korifi-chalkino"] });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(screen.getByTestId("tile-medal-leksokipos-stin-korifi")).toHaveTextContent("🥉"),
    );
    // The other four tiles are locked and must carry no medal at all.
    expect(screen.queryByTestId("tile-medal-leksokipos-tzimani")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tile-medal-leksokipos-makrylexis")).not.toBeInTheDocument();
  });

  // ── Word-length ladder: one climbing badge over the four frozen length ids ──

  it("lights the ladder tile from a frozen word-length id and shows that rung's medal", async () => {
    mockData({ earned: ["leksokipos-word-13"] });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tileFor("Μακρυλέξης")).toHaveAttribute("data-earned", "true"),
    );
    expect(screen.getByTestId("tile-medal-leksokipos-makrylexis")).toHaveTextContent("💠");
  });

  it("selects the ladder by its base id, not the frozen rung id", async () => {
    const spy = mockData({ earned: ["leksokipos-word-11"] });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tileFor("Μακρυλέξης")).toHaveAttribute("data-earned", "true"),
    );
    fireEvent.click(tileFor("Μακρυλέξης"));

    await waitFor(() =>
      expect(lastBadgePost(spy)?.selected_badge_id).toBe("leksokipos-makrylexis"),
    );
  });
});

// ── Badge picker (Handoff B) ──────────────────────────────────────────────────

describe("TrophyCase — display-badge picker", () => {
  it("tapping an earned tile selects it, POSTing the base achievement id", async () => {
    const spy = mockData({ earned: ["leksokipos-stin-korifi-chalkino"] });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-earned", "true"),
    );
    fireEvent.click(tileFor("Στην Κορυφή"));

    await waitFor(() =>
      expect(lastBadgePost(spy)).toEqual({ device_uuid: "dev-A", selected_badge_id: "leksokipos-stin-korifi" }),
    );
    expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-selected", "true");
  });

  it("selects a tiered tile by its BASE id (never a tier id)", async () => {
    const spy = mockData({ earned: ["leksokipos-kynigos-pangram-chalkino"] });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tileFor("Κυνηγός Πανγκράμ")).toHaveAttribute("data-earned", "true"),
    );
    fireEvent.click(tileFor("Κυνηγός Πανγκράμ"));

    await waitFor(() =>
      expect(lastBadgePost(spy)?.selected_badge_id).toBe("leksokipos-kynigos-pangram"),
    );
  });

  it("tapping the already-selected tile clears it, POSTing null", async () => {
    const spy = mockData({ earned: ["leksokipos-stin-korifi-chalkino"], selected: "leksokipos-stin-korifi" });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-selected", "true"),
    );
    fireEvent.click(tileFor("Στην Κορυφή"));

    await waitFor(() =>
      expect(lastBadgePost(spy)).toEqual({ device_uuid: "dev-A", selected_badge_id: null }),
    );
    expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-selected", "false");
  });

  it("a locked tile is inert — tapping it fires no badge POST", async () => {
    const spy = mockData({ earned: [] });
    render(<TrophyCase deviceId="dev-A" />);

    await waitFor(() =>
      expect(tileFor("Μακρυλέξης")).toHaveAttribute("data-earned", "false"),
    );
    fireEvent.click(tileFor("Μακρυλέξης"));

    expect(lastBadgePost(spy)).toBeNull();
  });
});
