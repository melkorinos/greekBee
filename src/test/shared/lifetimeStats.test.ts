// lifetimeStats.test.ts — pure aggregation for the /profile lifetime-stats strip.
//
// total_points and puzzles_played are cross-game (all of a device's rows).
// tzimani_count and leksokipos_points are Leksokipos-only (the garden game), so
// rows from other games must not inflate them. leksokipos_points feeds the
// Συλλέκτης Πόντων tier detection + Trophy Case progress (leksokipos-only scope).

import { describe, expect, it } from "vitest";

import { aggregateLifetimeStats } from "@/lib/lifetimeStats";

describe("aggregateLifetimeStats", () => {
  it("sums points and counts puzzles cross-game, but counts Τζιμάνι only for leksokipos", () => {
    const stats = aggregateLifetimeStats([
      { game_id: "leksokipos",  score: 120, is_perfect: true  },
      { game_id: "leksokipos",  score: 40,  is_perfect: false },
      { game_id: "leksiarxeio", score: 25,  is_perfect: true  }, // perfect, but not leksokipos
    ]);
    expect(stats).toEqual({
      total_points:     185,
      puzzles_played:   3,
      tzimani_count:    1,
      leksokipos_points: 160, // 120 + 40; the leksiarxeio 25 excluded
    });
  });

  it("sums leksokipos_points only from leksokipos rows, ignoring other games' scores", () => {
    const stats = aggregateLifetimeStats([
      { game_id: "leksiarxeio", score: 500, is_perfect: false },
      { game_id: "vrestifrasi", score: 300, is_perfect: false },
    ]);
    expect(stats.total_points).toBe(800);
    expect(stats.leksokipos_points).toBe(0);
  });

  it("returns all zeros for a device with no rows", () => {
    expect(aggregateLifetimeStats([])).toEqual({
      total_points:      0,
      puzzles_played:    0,
      tzimani_count:     0,
      leksokipos_points: 0,
    });
  });
});
