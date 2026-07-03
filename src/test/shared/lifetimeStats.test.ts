// lifetimeStats.test.ts — pure aggregation for the /profile lifetime-stats strip.
//
// total_points and puzzles_played are cross-game (all of a device's rows).
// tzimani_count is Leksokipos-only (a perfect daily in the garden game), so
// is_perfect rows from other games must not inflate it.

import { describe, expect, it } from "vitest";

import { aggregateLifetimeStats } from "@/lib/lifetimeStats";

describe("aggregateLifetimeStats", () => {
  it("sums points and counts puzzles cross-game, but counts Τζιμάνι only for leksokipos", () => {
    const stats = aggregateLifetimeStats([
      { game_id: "leksokipos",  score: 120, is_perfect: true  },
      { game_id: "leksokipos",  score: 40,  is_perfect: false },
      { game_id: "leksiarxeio", score: 25,  is_perfect: true  }, // perfect, but not leksokipos
    ]);
    expect(stats).toEqual({ total_points: 185, puzzles_played: 3, tzimani_count: 1 });
  });

  it("returns all zeros for a device with no rows", () => {
    expect(aggregateLifetimeStats([])).toEqual({
      total_points: 0,
      puzzles_played: 0,
      tzimani_count: 0,
    });
  });
});
