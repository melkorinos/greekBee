// placement — pure derivation of "first-place finish" counts from game_scores.
//
// A First-Place Finish is being rank 1 (ties included) on a game's Daily
// leaderboard for one puzzle_date. The count is DERIVED from append-forever
// game_scores, never stored (CONTEXT.md data-class 2 / ADR 0013). Every
// leaderboard is higher-is-better (ADR 0014), so "first" = the top score of the
// day. v1 scopes this to Leksokipos; the function is game-agnostic — the caller
// passes one game's rows.

export interface PlacementRow {
  device_id:   string;
  puzzle_date: string;
  score:       number;
}

/**
 * How many days `deviceId` finished first among `rows` — every game_scores row
 * for ONE game (one row per device per day, UNIQUE(game_id, device_id,
 * puzzle_date)). A day counts when the device's score equals that day's top
 * score across all devices (ties share rank 1 — Q2).
 */
export function countFirstPlaceFinishes(rows: PlacementRow[], deviceId: string): number {
  const dailyMax = new Map<string, number>();
  for (const r of rows) {
    const top = dailyMax.get(r.puzzle_date);
    if (top === undefined || r.score > top) dailyMax.set(r.puzzle_date, r.score);
  }

  let count = 0;
  for (const r of rows) {
    if (r.device_id === deviceId && r.score === dailyMax.get(r.puzzle_date)) count++;
  }
  return count;
}
