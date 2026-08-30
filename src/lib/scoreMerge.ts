// scoreMerge.ts — pure folds over game_scores rows. Data in, data out; the
// routes do the I/O and execute what these functions decide.
//
// Two merges live here, both answering "this row already exists — what should it
// become?":
//   planScoreMerge   — Sign-in Restore, best-score-wins across two identities
//   mergeLengthScore — Leksiarxeio, one length's result folded into the day's row
//
// ── planScoreMerge: best-score-wins for Sign-in Restore (ADR 0012) ────────────
//
// A returning player signing in on a new device merges that device's old
// game_scores into the adopted identity. For each (game_id, puzzle_date) the
// higher score survives; the losing row is deleted so every surviving row keeps
// its score consistent with its `data` blob (leksiarxeio stores per-length
// points there). Pure — the route executes the plan against the DB.

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

// ── mergeLengthScore: Leksiarxeio's per-length fold ───────────────────────────
//
// Leksiarxeio posts one result per word length (4–8), but the leaderboard holds
// one row per player per day. Each post folds its length into that row's `data`
// blob and re-totals: data is keyed by length (as a string — it is jsonb), the
// value is that length's in-game points, and `score` is their sum.
//
// Re-posting a length overwrites it rather than taking the max. That is the
// correct rule here, not a shortcut: a length is played once per day, so the only
// way the same length posts twice is a retry or an Offline-Lock outbox flush
// replaying an identical result — where overwrite is exactly idempotent. If
// Leksiarxeio ever lets a length be replayed for a better result, this is the one
// line to revisit.

/** A day's Leksiarxeio row after folding in one length's result. */
export interface LengthScoreMerge {
  /** The row's new `data` blob — length (stringified) → points. */
  data:  Record<string, number>;
  /** The row's new `score` — the sum of every length recorded so far. */
  score: number;
}

export function mergeLengthScore(
  /** The row's existing `data`, or null/undefined when the player has no row yet. */
  existing: Record<string, number> | null | undefined,
  length:   number,
  points:   number,
): LengthScoreMerge {
  const data = { ...(existing ?? {}), [String(length)]: points };
  const score = Object.values(data).reduce((sum, v) => sum + v, 0);
  return { data, score };
}
