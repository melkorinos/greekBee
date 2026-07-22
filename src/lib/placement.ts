// placement — pure derivation of podium-finish counts from game_scores.
//
// A Podium Finish is placing 1st/2nd/3rd on a game's Daily leaderboard for one
// puzzle_date. Counts are DERIVED from append-forever game_scores, never stored
// (CONTEXT.md data-class 2 / ADR 0013). Every leaderboard is higher-is-better
// (ADR 0014). Ranking is COMPETITION ranking: a device's rank on a day is
// 1 + (devices with a strictly higher score that day), so ties share a rank and
// a shared rank consumes the ranks below it (90, 90, 80 → the 80 is 3rd, no 2nd).
// This matches the leaderboard's playerRow rank, so profile and leaderboard
// agree. v1 scopes this to Leksokipos; the function is game-agnostic — the caller
// passes one game's rows.

export interface PlacementRow {
  device_id:   string;
  puzzle_date: string;
  score:       number;
}

export interface PodiumCounts {
  first:  number;
  second: number;
  third:  number;
}

/**
 * How many days `deviceId` placed 1st / 2nd / 3rd among `rows` — every
 * game_scores row for ONE game (one row per device per day, UNIQUE(game_id,
 * device_id, puzzle_date)). Competition ranking: rank = 1 + count of devices
 * with a strictly higher score that day; only ranks 1–3 land on the podium.
 */
export function countPodiumFinishes(rows: PlacementRow[], deviceId: string): PodiumCounts {
  // Per day, the set of distinct scores strictly above each score level lets us
  // rank without sorting: rank = 1 + (count of devices scoring strictly higher).
  const dailyScores = new Map<string, number[]>();
  for (const r of rows) {
    const list = dailyScores.get(r.puzzle_date);
    if (list) list.push(r.score);
    else dailyScores.set(r.puzzle_date, [r.score]);
  }

  const counts: PodiumCounts = { first: 0, second: 0, third: 0 };
  for (const r of rows) {
    if (r.device_id !== deviceId) continue;
    const scores = dailyScores.get(r.puzzle_date)!;
    const strictlyAbove = scores.reduce((n, s) => (s > r.score ? n + 1 : n), 0);
    const rank = 1 + strictlyAbove;
    if (rank === 1) counts.first++;
    else if (rank === 2) counts.second++;
    else if (rank === 3) counts.third++;
  }
  return counts;
}

/**
 * How many days `deviceId` finished first — the rank-1 tier of the podium.
 * Kept as the stable name behind the `leksokipos_first_place_count` response
 * field; delegates to countPodiumFinishes.
 */
export function countFirstPlaceFinishes(rows: PlacementRow[], deviceId: string): number {
  return countPodiumFinishes(rows, deviceId).first;
}
