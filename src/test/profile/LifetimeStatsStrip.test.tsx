// LifetimeStatsStrip — the three-number lifetime-stats strip on /profile.
//
// Pure display over the page's shared /api/profile/stats read: the three real
// numbers on success, a skeleton while `stats` is still null, and dashes once the
// read has failed — it must never block the page. The fetch itself lives in
// useProfileStats and is tested there.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LifetimeStatsStrip } from "@/components/profile/LifetimeStatsStrip";
import type { ProfileStats } from "@/hooks/useProfileStats";

function stats(over: Partial<ProfileStats> = {}): ProfileStats {
  return {
    total_points:      0,
    puzzles_played:    0,
    leksokipos_points: 0,
    pangram_count:     0,
    top_rank_count:    0,
    tzimani_count:     0,
    ...over,
  };
}

describe("LifetimeStatsStrip", () => {
  it("shows the three stats with Greek labels on success", () => {
    render(
      <LifetimeStatsStrip
        stats={stats({ total_points: 150, puzzles_played: 5, pangram_count: 7 })}
      />,
    );

    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("Πόντοι")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Πανγκράμ")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("shows a skeleton while the read is pending", () => {
    render(<LifetimeStatsStrip stats={null} />);
    expect(screen.getByTestId("stats-skeleton")).toBeInTheDocument();
  });

  it("degrades to dashes once the read has failed, without blocking", () => {
    // `errored` is what separates "gave up" from "still loading" — without it a
    // failed read would leave the strip pulsing forever.
    render(<LifetimeStatsStrip stats={null} errored />);
    expect(screen.queryByTestId("stats-skeleton")).toBeNull();
    expect(screen.getAllByText("—")).toHaveLength(3);
  });
});
