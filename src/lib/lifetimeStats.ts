// lifetimeStats — pure aggregation for the /profile lifetime-stats strip.
//
// Fed the raw game_scores rows for one device (UNIQUE game_id/device/date, so one
// row per puzzle played). Points and puzzle count are cross-game; leksokipos_points
// is a Leksokipos concept, so only leksokipos rows count toward it. leksokipos_points
// feeds the Συλλέκτης Πόντων tier detection and Trophy Case progress (a Leksokipos
// badge earns from Leksokipos points only).

export interface LifetimeStatRow {
  game_id: string;
  score:   number;
}

export interface LifetimeStats {
  total_points:      number;
  puzzles_played:    number;
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
        leksokipos_points: acc.leksokipos_points + (isLeksokipos ? r.score : 0),
      };
    },
    { total_points: 0, puzzles_played: 0, leksokipos_points: 0 },
  );
}
