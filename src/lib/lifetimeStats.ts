// lifetimeStats — pure aggregation for the /profile lifetime-stats strip.
//
// Fed the raw game_scores rows for one device (UNIQUE game_id/device/date, so one
// row per puzzle played). Points and puzzle count are cross-game; Τζιμάνι (perfect
// daily) and leksokipos_points are Leksokipos concepts, so only leksokipos rows
// count toward them. leksokipos_points feeds the Συλλέκτης Πόντων tier detection
// and Trophy Case progress (a Leksokipos badge earns from Leksokipos points only).

export interface LifetimeStatRow {
  game_id:    string;
  score:      number;
  is_perfect: boolean;
}

export interface LifetimeStats {
  total_points:      number;
  puzzles_played:    number;
  tzimani_count:     number;
  leksokipos_points: number;
}

const LEKSOKIPOS_GAME = "leksokipos";

export function aggregateLifetimeStats(rows: LifetimeStatRow[]): LifetimeStats {
  return rows.reduce<LifetimeStats>(
    (acc, r) => {
      const isLeksokipos = r.game_id === LEKSOKIPOS_GAME;
      return {
        total_points:      acc.total_points + r.score,
        puzzles_played:    acc.puzzles_played + 1,
        tzimani_count:     acc.tzimani_count + (r.is_perfect && isLeksokipos ? 1 : 0),
        leksokipos_points: acc.leksokipos_points + (isLeksokipos ? r.score : 0),
      };
    },
    { total_points: 0, puzzles_played: 0, tzimani_count: 0, leksokipos_points: 0 },
  );
}
