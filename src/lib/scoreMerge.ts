// scoreMerge.ts — planScoreMerge: best-score-wins for Sign-in Restore (ADR 0012).
// Data in, data out; the route does the I/O and executes what this decides.
//
// A returning player signing in on a new device merges that device's old
// game_scores into the adopted identity. For each (game_id, puzzle_date) the
// higher score survives and the losing row is deleted. Pure — the route executes
// the plan against the DB.
//
// `mergeLengthScore` lived here too until ADR 0027 removed Λεξιαρχείο's scoring;
// it was the only writer of the `data` column, which its own migration drops.

export interface MergeRow {
  id:          number;
  game_id:     string;
  puzzle_date: string;
  score:       number;
}

export interface MergePlan {
  /** Old-device row ids to re-point onto the adopted identity. */
  repoint:         number[];
  /** Old-device row ids the canonical identity already beats — delete. */
  deleteOld:       number[];
  /** Canonical row ids the old device beats — delete so the old row wins. */
  deleteCanonical: number[];
}

export function planScoreMerge(oldRows: MergeRow[], canonicalRows: MergeRow[]): MergePlan {
  const plan: MergePlan = { repoint: [], deleteOld: [], deleteCanonical: [] };

  const key = (r: MergeRow) => `${r.game_id}|${r.puzzle_date}`;
  const canonicalByKey = new Map<string, MergeRow>();
  for (const c of canonicalRows) canonicalByKey.set(key(c), c);

  for (const old of oldRows) {
    const rival = canonicalByKey.get(key(old));
    if (!rival) {
      // Only the old device played this puzzle — carry it over.
      plan.repoint.push(old.id);
    } else if (old.score > rival.score) {
      // Old device did better — its row wins; drop the canonical one.
      plan.repoint.push(old.id);
      plan.deleteCanonical.push(rival.id);
    } else {
      // Canonical row is at least as good — drop the old one.
      plan.deleteOld.push(old.id);
    }
  }

  return plan;
}
