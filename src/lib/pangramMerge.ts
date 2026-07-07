// pangramMerge.ts — pure union planning for Sign-in Restore (ADR 0013, B2).
//
// A returning player signing in on a new device merges that device's pangram
// finds into the adopted (canonical) identity. Pangrams are a SET — a find is a
// find, there is no "better" — so the merge is a union: carry over every old row
// the canonical lacks, and drop old duplicates the canonical already has (the
// UNIQUE(device_uuid, puzzle_date, word) constraint forbids two). Unlike
// achievements, the dedup key is the composite (puzzle_date, word): the same word
// on a different day is a distinct find (B2/R1). Double-count on merge is
// impossible by construction — a set union, never a counter. Pure — the route
// executes the plan against the DB.
//
// Supabase returns `date` columns as "YYYY-MM-DD" strings, so puzzle_date compares
// as a plain string here.

export interface PangramMergeRow {
  id:          number;
  puzzle_date: string;
  word:        string;
}

export interface PangramMergePlan {
  /** Old-device row ids to re-point onto the adopted identity. */
  repoint:   number[];
  /** Old-device row ids the canonical identity already has — delete as duplicates. */
  deleteOld: number[];
}

const key = (r: PangramMergeRow) => `${r.puzzle_date}::${r.word}`;

export function planPangramMerge(
  oldRows:       PangramMergeRow[],
  canonicalRows: PangramMergeRow[],
): PangramMergePlan {
  const plan: PangramMergePlan = { repoint: [], deleteOld: [] };

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
