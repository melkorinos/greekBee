// wordsMerge.ts — pure union planning for Sign-in Restore (ADR 0013 lane C).
//
// A returning player signing in on a new device merges that device's word finds
// into the adopted (canonical) identity. Words are a SET — a find is a find, there
// is no "better" — so the merge is a union: carry over every old row the canonical
// lacks, and drop old duplicates the canonical already has (the
// UNIQUE(device_uuid, puzzle_date, word) constraint forbids two). The dedup key is
// the composite (puzzle_date, word): the same word on a different day is a distinct
// find. Double-count on merge is impossible by construction — a set union, never a
// counter. Pure — the route executes the plan against the DB. Identical shape to
// planPangramMerge (a later cleanup could merge the two; separate for now).
//
// Supabase returns `date` columns as "YYYY-MM-DD" strings, so puzzle_date compares
// as a plain string here.

export interface WordsMergeRow {
  id:          number;
  puzzle_date: string;
  word:        string;
}

export interface WordsMergePlan {
  /** Old-device row ids to re-point onto the adopted identity. */
  repoint:   number[];
  /** Old-device row ids the canonical identity already has — delete as duplicates. */
  deleteOld: number[];
}

const key = (r: WordsMergeRow) => `${r.puzzle_date}::${r.word}`;

export function planWordsMerge(
  oldRows:       WordsMergeRow[],
  canonicalRows: WordsMergeRow[],
): WordsMergePlan {
  const plan: WordsMergePlan = { repoint: [], deleteOld: [] };

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
