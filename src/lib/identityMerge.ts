// identityMerge.ts — executes Sign-in Restore's row movement (ADR 0012/0013).
//
// When a returning player signs in on a new device, every table keyed on that
// device's identity has to move onto the adopted (canonical) one. Three tables
// need it — game_scores, player_achievements, player_milestones — and all three
// follow the identical shape:
//
//     read both identities' rows → plan the merge off-DB → delete losers → re-point survivors
//
// The *deciding* is per-table and already pure (planScoreMerge, planAchievementMerge,
// planMilestoneMerge). Only the *executing* was copy-pasted, once per table, in the
// route. It lives here now as one loop over a lane table, so adding a fourth
// identity-keyed table is a four-line entry rather than a fourth transcription.
//
// Deliberately not a repository/port abstraction: there is exactly one production
// caller, so a second adapter would exist only to be tested. This takes the shared
// `table()` accessor as an argument instead — testable by passing a stub, with no
// interface to keep in sync.

import type { BoundTable, TableName } from "@/lib/supabase";
import { planScoreMerge, type MergeRow } from "@/lib/scoreMerge";
import { planAchievementMerge, type AchievementMergeRow } from "@/lib/achievementMerge";
import { planMilestoneMerge, type MilestoneMergeRow } from "@/lib/milestoneMerge";

/** The union of every per-table merge plan, as the executor needs to see it. */
interface LanePlan {
  /** Old-device row ids to re-point onto the adopted identity. */
  repoint:          number[];
  /** Old-device row ids to drop (the canonical identity already has/beats them). */
  deleteOld:        number[];
  /** Canonical row ids to drop — only game_scores has a "worse" row to lose. */
  deleteCanonical?: number[];
}

interface MergeLane {
  table:   TableName;
  /** The column holding the identity — device_id on scores, device_uuid elsewhere. */
  owner:   string;
  /** The select list the lane's plan function needs. */
  columns: string;
  /**
   * Decides the merge. Rows arrive untyped from the shared reader and each lane
   * casts to its own row shape — the cast sits next to the select list it has to
   * match, which is the only place the two can drift.
   */
  plan:    (oldRows: unknown[], canonRows: unknown[]) => LanePlan;
}

const LANES: MergeLane[] = [
  {
    // Scores are ranked: for each (game_id, puzzle_date) the higher score survives
    // and the loser is deleted, so a surviving row's score stays consistent with
    // its `data` blob.
    table:   "game_scores",
    owner:   "device_id",
    columns: "id, game_id, puzzle_date, score",
    plan:    (o, c) => planScoreMerge(o as MergeRow[], c as MergeRow[]),
  },
  {
    // Achievements are a set — there is no "better" badge. Carry over what the
    // canonical identity lacks; drop the duplicates UNIQUE(device_uuid,
    // achievement_id) would otherwise reject.
    table:   "player_achievements",
    owner:   "device_uuid",
    columns: "id, achievement_id",
    plan:    (o, c) => planAchievementMerge(o as AchievementMergeRow[], c as AchievementMergeRow[]),
  },
  {
    // Milestones are a set too, dedup'd on the composite (puzzle_date, kind,
    // detail): the same word on a different day is a distinct find, and the
    // detail-less day counters are separated by kind alone.
    table:   "player_milestones",
    owner:   "device_uuid",
    columns: "id, puzzle_date, kind, detail",
    plan:    (o, c) => planMilestoneMerge(o as MilestoneMergeRow[], c as MilestoneMergeRow[]),
  },
];

/**
 * Moves every identity-keyed row from `from` onto `into`, one table at a time.
 *
 * Row counts are small (the leaderboard window is days, pruned by cleanup-scores)
 * and this runs once per sign-in restore, so the per-lane batch writes are cheap.
 *
 * Not transactional: each lane's deletes and re-point are separate statements. A
 * failure mid-way leaves some rows moved and some not, which is recoverable —
 * re-running the merge is idempotent, since a row already on the canonical
 * identity simply stops appearing in the old identity's read.
 */
export async function mergeIdentityRows(db: BoundTable, from: string, into: string): Promise<void> {
  for (const lane of LANES) {
    const { data: oldRows } = await db(lane.table)
      .select(lane.columns).eq(lane.owner, from) as { data: unknown[] | null };
    const { data: canonRows } = await db(lane.table)
      .select(lane.columns).eq(lane.owner, into) as { data: unknown[] | null };

    const plan = lane.plan(oldRows ?? [], canonRows ?? []);

    // Deletes run before the re-point, and the order is load-bearing on
    // game_scores: UNIQUE(game_id, device_id, puzzle_date) means re-pointing an
    // old row that beat a canonical row would collide with the very row it beat,
    // if that loser were still present. Clearing losers first keeps every
    // re-point landing on free ground.
    if (plan.deleteCanonical?.length) {
      await db(lane.table).delete().in("id", plan.deleteCanonical);
    }
    if (plan.deleteOld.length) {
      await db(lane.table).delete().in("id", plan.deleteOld);
    }
    if (plan.repoint.length) {
      // The payload is a computed key, so it cannot resolve against the generated
      // Update type for a table only known as a union here. The column name is
      // fixed per lane just above; nothing else about the row is touched.
      await db(lane.table)
        .update({ [lane.owner]: into } as never)
        .in("id", plan.repoint);
    }
  }
}
