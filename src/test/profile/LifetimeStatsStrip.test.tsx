// LifetimeStatsStrip — the four-number lifetime-stats strip on /profile.
//
// Fetches GET /api/profile/stats on mount. Shows a skeleton while loading, the
// four real numbers on success, and degrades to dashes on error — it must never
// block the page.

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LifetimeStatsStrip } from "@/components/profile/LifetimeStatsStrip";

afterEach(() => vi.restoreAllMocks());

function mockStats(body: unknown, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

describe("LifetimeStatsStrip", () => {
  it("shows the three stats plus the podium cell with Greek labels on success", async () => {
    mockStats({
      total_points: 150, puzzles_played: 5, pangram_count: 7,
      leksokipos_first_place_count: 3,
      leksokipos_second_place_count: 2,
      leksokipos_third_place_count: 1,
    });
    render(<LifetimeStatsStrip deviceId="dev-A" />);

    await waitFor(() => expect(screen.getByText("150")).toBeInTheDocument());
    expect(screen.getByText("Πόντοι")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Πανγκράμ")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    // Podium: one cell, the three medals with their counts.
    expect(screen.getByText("Βάθρο")).toBeInTheDocument();
    expect(screen.getByText("🥇 3")).toBeInTheDocument();
    expect(screen.getByText("🥈 2")).toBeInTheDocument();
    expect(screen.getByText("🥉 1")).toBeInTheDocument();
  });

  it("shows a skeleton while the fetch is pending", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {})); // never resolves
    render(<LifetimeStatsStrip deviceId="dev-A" />);
    expect(screen.getByTestId("stats-skeleton")).toBeInTheDocument();
  });

  it("degrades to dashes on fetch error without blocking", async () => {
    mockStats({}, false); // ok: false
    render(<LifetimeStatsStrip deviceId="dev-A" />);
    await waitFor(() => expect(screen.queryByTestId("stats-skeleton")).toBeNull());
    // Three stat cells dash; the podium's three medals dash too.
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getByText("🥇 —")).toBeInTheDocument();
    expect(screen.getByText("🥈 —")).toBeInTheDocument();
    expect(screen.getByText("🥉 —")).toBeInTheDocument();
  });
});
