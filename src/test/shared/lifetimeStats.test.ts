// lifetimeStats.test.ts — pure aggregation for the /profile lifetime-stats strip.
//
// total_points and puzzles_played are cross-game (all of a device's rows).
// leksokipos_points is Leksokipos-only (the garden game), so rows from other games
// must not inflate it. leksokipos_points feeds the Συλλέκτης Πόντων tier detection
// + Trophy Case progress (leksokipos-only scope).

import { describe, expect, it } from "vitest";

import { aggregateLifetimeStats } from "@/lib/lifetimeStats";

describe("aggregateLifetimeStats", () => {
  it("sums points and counts puzzles cross-game", () => {
    const stats = aggregateLifetimeStats([
      { game_id: "leksokipos",  score: 120 },
      { game_id: "leksokipos",  score: 40  },
      { game_id: "leksiarxeio", score: 25  },
    ]);
    expect(stats).toEqual({
      total_points:     185,
      puzzles_played:   3,
      leksokipos_points: 160, // 120 + 40; the leksiarxeio 25 excluded
    });
  });

  it("sums leksokipos_points only from leksokipos rows, ignoring other games' scores", () => {
    const stats = aggregateLifetimeStats([
      { game_id: "leksiarxeio", score: 500 },
      { game_id: "vrestifrasi", score: 300 },
    ]);
    expect(stats.total_points).toBe(800);
    expect(stats.leksokipos_points).toBe(0);
  });

  it("returns all zeros for a device with no rows", () => {
    expect(aggregateLifetimeStats([])).toEqual({
      total_points:      0,
      puzzles_played:    0,
      leksokipos_points: 0,
    });
  });
});
