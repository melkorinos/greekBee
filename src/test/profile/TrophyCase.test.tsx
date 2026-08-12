// TrophyCase — the trophy grid on /profile.
//
// Renders the frozen catalog, lights earned one-shots, and lights per-tier chips of
// each tiered badge either when earned server-side OR when a live lifetime value
// crosses the threshold, plus an "X / N" progress line toward the next tier. Earned
// ids come from /api/achievements (the component's own fetch); the four live values
// arrive as a `stats` PROP — the page reads /api/profile/stats once and shares it
// with the lifetime strip, so this component no longer fetches it.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrophyCase } from "@/components/profile/TrophyCase";
import { GAME_REGISTRY } from "@/config/games";
import { LEKSOKIPOS_ACHIEVEMENTS } from "@/games/leksokipos/lib/achievements";
import type { ProfileStats } from "@/hooks/useProfileStats";

afterEach(() => vi.restoreAllMocks());

/** The tile element wrapping a given achievement name. */
function tileFor(name: string): HTMLElement {
  return screen.getByText(name).closest("[data-testid='trophy-tile']") as HTMLElement;
}

/** The tier chip element for a given frozen tier id. */
function tierChip(tierId: string): HTMLElement {
  return screen.getByTestId(`tier-chip-${tierId}`);
}

/** The drawn badge inside a tile — every tile has exactly one, earned or locked. */
function markIn(tile: HTMLElement): HTMLElement {
  return tile.querySelector("[data-testid='badge-mark']") as HTMLElement;
}

/** The catalog's own art for a base badge id — the tile must draw exactly this. */
function markPathOf(baseId: string): string {
  return LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === baseId)!.mark.path;
}

interface CaseOptions {
  earned?:   string[];
  points?:   number;
  pangrams?: number;
  topRank?:  number;
  tzimani?:  number;
  selected?: string | null;
  /** false = both the shared stats read and the component's own fetches failed. */
  ok?:       boolean;
  deviceId?: string;
}

/**
 * Mock the two endpoints the component still owns: /api/achievements → { earned },
 * /api/profile/badge → { selected_badge_id }. Both share the ok flag so an error
 * case fails both reads.
 */
function mockData({ earned = [], selected = null, ok = true }: CaseOptions = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    let body: unknown = { earned };
    if (url.includes("/api/profile/badge")) body = { selected_badge_id: selected };
    return Promise.resolve({ ok, json: async () => body } as Response);
  });
}

/** The shared stats read the page would hand down — null when that read failed. */
function statsFor(o: CaseOptions): ProfileStats | null {
  if (o.ok === false) return null;
  return {
    total_points:      0,
    puzzles_played:    0,
    leksokipos_points: o.points   ?? 0,
    pangram_count:     o.pangrams ?? 0,
    top_rank_count:    o.topRank  ?? 0,
    tzimani_count:     o.tzimani  ?? 0,
  };
}

/** Mock + render in one call; returns the fetch spy for POST assertions. */
function renderCase(o: CaseOptions = {}) {
  const spy = mockData(o);
  render(<TrophyCase deviceId={o.deviceId ?? "dev-A"} stats={statsFor(o)} />);
  return spy;
}

/** The most recent POST to /api/profile/badge, parsed, or null if none fired. */
function lastBadgePost(spy: ReturnType<typeof vi.spyOn>): { device_uuid: string; selected_badge_id: string | null } | null {
  const calls = spy.mock.calls as [RequestInfo | URL, RequestInit?][];
  const post = [...calls].reverse().find(
    ([url, init]) => String(url).includes("/api/profile/badge") && init?.method === "POST",
  );
  return post ? JSON.parse(String(post[1]!.body)) : null;
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
    renderCase({ earned: ["leksokipos-stin-korifi-chalkino"] });

    await waitFor(() =>
      expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-earned", "true"),
    );
    expect(tileFor("Μακρυλέξης")).toHaveAttribute("data-earned", "false");
  });

  it("draws an earned tile's own mark, framed in the tier it holds", async () => {
    renderCase({ earned: ["leksokipos-stin-korifi-chalkino"] });

    await waitFor(() =>
      expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-earned", "true"),
    );
    const badge = markIn(tileFor("Στην Κορυφή"));
    expect(badge).toHaveAttribute("data-tier", "chalkino");
    expect(badge.querySelector("path")).toHaveAttribute("d", markPathOf("leksokipos-stin-korifi"));
  });

  it("still draws the mark on a locked tile, so a player can see what they are chasing", () => {
    // Replaces the 🔒, which showed every unearned badge as the same padlock. The
    // locked frame is neutral — never a dimmed version of a tier not yet earned.
    render(<TrophyCase deviceId="" />);
    const badge = markIn(tileFor("Μακρυλέξης"));

    expect(badge).toHaveAttribute("data-locked", "true");
    expect(badge).not.toHaveAttribute("data-tier");
    expect(badge.querySelector("path")).toHaveAttribute("d", markPathOf("leksokipos-makrylexis"));
  });

  it("shows no emoji on any tile, earned or locked", async () => {
    renderCase({ earned: ["leksokipos-stin-korifi-chalkino"] });

    await waitFor(() =>
      expect(tileFor("Στην Κορυφή")).toHaveAttribute("data-earned", "true"),
    );
    // Only the beta notice keeps its 🚧; the tiles themselves are text + drawings.
    for (const tile of screen.getAllByTestId("trophy-tile")) {
      expect(tile.textContent ?? "").not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  it("keeps every tile locked when the device has earned nothing", async () => {
    renderCase({ earned: [] });

    await waitFor(() =>
      expect(screen.getAllByTestId("trophy-tile").length).toBeGreaterThan(0),
    );
    for (const tile of screen.getAllByTestId("trophy-tile")) {
      expect(tile).toHaveAttribute("data-earned", "false");
    }
  });

  it("keeps every tile locked on fetch error, without crashing", async () => {
    renderCase({ earned: [], ok: false });

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

  it("never fetches /api/profile/stats — the page reads it once and hands it down", async () => {
    const spy = renderCase({ earned: [], points: 1500 });

    await waitFor(() =>
      expect(tierChip("leksokipos-syllektis-ponton-chalkino")).toHaveAttribute("data-earned", "true"),
    );
    const urls = (spy.mock.calls as [RequestInfo | URL, RequestInit?][]).map(([u]) => String(u));
    expect(urls.some((u) => u.includes("/api/profile/stats"))).toBe(false);
  });

  it("lights a points-tier chip when live points cross it, even if not earned server-side", async () => {
    renderCase({ earned: [], points: 1500 }); // ≥ χάλκινο (1000), < ασημένιο (10000)

    await waitFor(() =>
      expect(tierChip("leksokipos-syllektis-ponton-chalkino")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-syllektis-ponton-asimenio")).toHaveAttribute("data-earned", "false");
  });

  it("lights a points-tier chip earned server-side even when the live points are lower", async () => {
    // Earned fact is authoritative; a lagging/low points read must not un-light it.
    renderCase({ earned: ["leksokipos-syllektis-ponton-chalkino"], points: 0 });

    await waitFor(() =>
      expect(tierChip("leksokipos-syllektis-ponton-chalkino")).toHaveAttribute("data-earned", "true"),
    );
  });

  it("shows X / N progress toward the next uncrossed points tier", async () => {
    renderCase({ earned: [], points: 740 });

    await waitFor(() =>
      // el-GR grouping: next threshold 1000 → "1.000"
      expect(screen.getByTestId("tier-progress-leksokipos-syllektis-ponton")).toHaveTextContent("740 / 1.000"),
    );
  });

  it("shows no progress line once every points tier is crossed", async () => {
    renderCase({ earned: [], points: 30000 }); // past χρυσό (25000)

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
    renderCase({ earned: [], pangrams: 25 }); // ≥ χάλκινο (25), < ασημένιο (60)

    await waitFor(() =>
      expect(tierChip("leksokipos-kynigos-pangram-chalkino")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-kynigos-pangram-asimenio")).toHaveAttribute("data-earned", "false");
  });

  it("lights a pangram-tier chip earned server-side even when the live count is lower", async () => {
    renderCase({ earned: ["leksokipos-kynigos-pangram-chalkino"], pangrams: 0 });

    await waitFor(() =>
      expect(tierChip("leksokipos-kynigos-pangram-chalkino")).toHaveAttribute("data-earned", "true"),
    );
  });

  it("shows X / N progress toward the next uncrossed pangram tier", async () => {
    renderCase({ earned: [], pangrams: 7 });

    await waitFor(() =>
      expect(screen.getByTestId("tier-progress-leksokipos-kynigos-pangram")).toHaveTextContent("7 / 25"),
    );
  });

  // ── The two day-count badges (TICKET-02): live sources are the milestone counts ──

  it("lights a Στην Κορυφή chip from the live top-rank day count", async () => {
    renderCase({ earned: [], topRank: 10 }); // ≥ ασημένιο (10), < χρυσό (25)

    await waitFor(() =>
      expect(tierChip("leksokipos-stin-korifi-asimenio")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-stin-korifi-chryso")).toHaveAttribute("data-earned", "false");
  });

  it("shows X / N progress toward the next uncrossed Στην Κορυφή tier", async () => {
    renderCase({ earned: [], topRank: 3 });

    await waitFor(() =>
      expect(screen.getByTestId("tier-progress-leksokipos-stin-korifi")).toHaveTextContent("3 / 10"),
    );
  });

  it("lights a Τζιμάνι chip from the live qualifying-day count", async () => {
    renderCase({ earned: [], tzimani: 5 }); // ≥ ασημένιο (5), < χρυσό (10)

    await waitFor(() =>
      expect(tierChip("leksokipos-tzimani-asimenio")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-tzimani-chryso")).toHaveAttribute("data-earned", "false");
  });

  it("shows X / N progress toward the next uncrossed Τζιμάνι tier", async () => {
    renderCase({ earned: [], tzimani: 2 });

    await waitFor(() =>
      expect(screen.getByTestId("tier-progress-leksokipos-tzimani")).toHaveTextContent("2 / 5"),
    );
  });

  it("keeps each badge's live value on its own tile", async () => {
    // Four badges now read four different numbers off one stats response; crossing
    // the wires would light a tier the player has not reached.
    renderCase({ earned: [], points: 0, pangrams: 0, topRank: 25, tzimani: 0 });

    await waitFor(() =>
      expect(tierChip("leksokipos-stin-korifi-chryso")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-tzimani-chalkino")).toHaveAttribute("data-earned", "false");
    expect(tierChip("leksokipos-kynigos-pangram-chalkino")).toHaveAttribute("data-earned", "false");
    expect(tierChip("leksokipos-syllektis-ponton-chalkino")).toHaveAttribute("data-earned", "false");
  });

  it("lights chips from earned facts alone when the shared stats read failed", async () => {
    // stats={null} is the page saying "no live numbers this load". Earned tiers must
    // still light, and nothing may light at zero.
    mockData({ earned: ["leksokipos-tzimani-chalkino"] });
    render(<TrophyCase deviceId="dev-A" stats={null} />);

    await waitFor(() =>
      expect(tierChip("leksokipos-tzimani-chalkino")).toHaveAttribute("data-earned", "true"),
    );
    expect(tierChip("leksokipos-tzimani-asimenio")).toHaveAttribute("data-earned", "false");
    // No live value means no progress denominator either.
    expect(screen.queryByTestId("tier-progress-leksokipos-tzimani")).not.toBeInTheDocument();
  });

  // ── The tile's tier frame: a top-tier holder must not look like a bronze one ──
  //
  // This was three 🥉🥈🥇 medal spans until TICKET-03. The frame replaced them, so
  // the assertions moved onto the mark's resolved tier — same question, no emoji.

  it("frames a tiered tile in the highest earned tier", async () => {
    renderCase({ earned: ["leksokipos-kynigos-pangram-chryso"] });

    await waitFor(() =>
      expect(markIn(tileFor("Κυνηγός Πανγκράμ"))).toHaveAttribute("data-tier", "chryso"),
    );
  });

  it("frames in bronze when only the lowest tier is held", async () => {
    renderCase({ earned: ["leksokipos-kynigos-pangram-chalkino"] });

    await waitFor(() =>
      expect(markIn(tileFor("Κυνηγός Πανγκράμ"))).toHaveAttribute("data-tier", "chalkino"),
    );
  });

  it("frames a tier reached only by the live value", async () => {
    renderCase({ earned: [], points: 30000 }); // past χρυσό, nothing recorded server-side

    await waitFor(() =>
      expect(markIn(tileFor("Συλλέκτης Πόντων"))).toHaveAttribute("data-tier", "chryso"),
    );
  });

  it("leaves a tile with no tier held in the neutral locked frame", async () => {
    renderCase({ earned: ["leksokipos-stin-korifi-chalkino"] });

    await waitFor(() =>
      expect(markIn(tileFor("Στην Κορυφή"))).toHaveAttribute("data-tier", "chalkino"),
    );
    // The other four tiles are locked: neutral frame, no borrowed tier colour.
    for (const name of ["Τζιμάνι", "Μακρυλέξης"]) {
      expect(markIn(tileFor(name))).toHaveAttribute("data-locked", "true");
      expect(markIn(tileFor(name))).not.toHaveAttribute("data-tier");
    }
  });

  // ── Word-length ladder: one climbing badge over the four frozen length ids ──

  it("lights the ladder tile from a frozen word-length id and frames it at that rung", async () => {
    renderCase({ earned: ["leksokipos-word-13"] });

    await waitFor(() =>
      expect(tileFor("Μακρυλέξης")).toHaveAttribute("data-earned", "true"),
    );
    // Σεντόνι is the diamanti rung — the fourth tier above gold.
    expect(markIn(tileFor("Μακρυλέξης"))).toHaveAttribute("data-tier", "diamanti");
  });

  it("selects the ladder by its base id, not the frozen rung id", async () => {
    const spy = renderCase({ earned: ["leksokipos-word-11"] });

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
    const spy = renderCase({ earned: ["leksokipos-stin-korifi-chalkino"] });

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
    const spy = renderCase({ earned: ["leksokipos-kynigos-pangram-chalkino"] });

    await waitFor(() =>
      expect(tileFor("Κυνηγός Πανγκράμ")).toHaveAttribute("data-earned", "true"),
    );
    fireEvent.click(tileFor("Κυνηγός Πανγκράμ"));

    await waitFor(() =>
      expect(lastBadgePost(spy)?.selected_badge_id).toBe("leksokipos-kynigos-pangram"),
    );
  });

  it("tapping the already-selected tile clears it, POSTing null", async () => {
    const spy = renderCase({ earned: ["leksokipos-stin-korifi-chalkino"], selected: "leksokipos-stin-korifi" });

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
    const spy = renderCase({ earned: [] });

    await waitFor(() =>
      expect(tileFor("Μακρυλέξης")).toHaveAttribute("data-earned", "false"),
    );
    fireEvent.click(tileFor("Μακρυλέξης"));

    expect(lastBadgePost(spy)).toBeNull();
  });
});
