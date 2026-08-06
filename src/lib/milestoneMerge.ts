// milestoneMerge.ts — pure union planning for Sign-in Restore (ADR 0013).
//
// A returning player signing in on a new device merges that device's milestones
// into the adopted (canonical) identity. Milestones are a SET — a find is a find
// and a qualifying day is a qualifying day, there is no "better" — so the merge is
// a union: carry over every old row the canonical lacks, and drop old duplicates
// the canonical already has (the UNIQUE(device_uuid, puzzle_date, kind, detail)
// constraint forbids two). Double-count on merge is impossible by construction —
// a set union, never a counter. Pure: the route executes the plan against the DB.
//
// Replaces planPangramMerge + planWordsMerge, which were the same function twice
// over two tables. The dedup key gains `kind` and renames `word` to `detail`: the
// same word can legitimately hold both a 'word' and a 'pangram' row for one date,
// and the two detail-less day counters ('top_rank', 'tzimani') are separated by
// kind alone — which is why detail is NOT NULL DEFAULT '' rather than nullable.
//
// Supabase returns `date` columns as "YYYY-MM-DD" strings, so puzzle_date compares
// as a plain string here.

export interface MilestoneMergeRow {
  id:          number;
  puzzle_date: string;
  kind:        string;
  /** The word for 'word'/'pangram' rows; '' for the day counters. Never null. */
  detail:      string;
}

export interface MilestoneMergePlan {
  /** Old-device row ids to re-point onto the adopted identity. */
  repoint:   number[];
  /** Old-device row ids the canonical identity already has — delete as duplicates. */
  deleteOld: number[];
}

const key = (r: MilestoneMergeRow) => `${r.puzzle_date}::${r.kind}::${r.detail}`;

export function planMilestoneMerge(
  oldRows:       MilestoneMergeRow[],
  canonicalRows: MilestoneMergeRow[],
): MilestoneMergePlan {
  const plan: MilestoneMergePlan = { repoint: [], deleteOld: [] };

  const canonicalKeys = new Set(canonicalRows.map(key));

  for (const old of oldRows) {
    if (canonicalKeys.has(key(old))) {
      plan.deleteOld.push(old.id);
    } else {
      plan.repoint.push(old.id);
    }
  }

  return plan;
}
