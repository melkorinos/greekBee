// lifetimeStats — pure aggregation for the /profile lifetime-stats strip.
//
// Fed the raw game_scores rows for one device (UNIQUE game_id/device/date, so one
// row per puzzle played). Points and puzzle count are cross-game; Τζιμάνι (perfect
// daily) is a Leksokipos concept, so only leksokipos perfect rows count toward it.

export interface LifetimeStatRow {
  game_id:    string;
  score:      number;
  is_perfect: boolean;
}

export interface LifetimeStats {
  total_points:   number;
  puzzles_played: number;
  tzimani_count:  number;
}

const TZIMANI_GAME = "leksokipos";

export function aggregateLifetimeStats(rows: LifetimeStatRow[]): LifetimeStats {
  return rows.reduce<LifetimeStats>(
    (acc, r) => ({
      total_points:   acc.total_points + r.score,
      puzzles_played: acc.puzzles_played + 1,
      tzimani_count:  acc.tzimani_count + (r.is_perfect && r.game_id === TZIMANI_GAME ? 1 : 0),
    }),
    { total_points: 0, puzzles_played: 0, tzimani_count: 0 },
  );
}
