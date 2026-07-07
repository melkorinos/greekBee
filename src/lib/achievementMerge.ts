// achievementMerge.ts — pure union planning for Sign-in Restore (ADR 0013).
//
// A returning player signing in on a new device merges that device's earned
// achievements into the adopted (canonical) identity. Achievements are a SET —
// earned is earned, there is no "better" — so the merge is a union: carry over
// every old row the canonical lacks, and drop old duplicates the canonical
// already has (the UNIQUE(device_uuid, achievement_id) constraint forbids two).
// Pure — the route executes the plan against the DB.

export interface AchievementMergeRow {
  id:             number;
  achievement_id: string;
}

export interface AchievementMergePlan {
  /** Old-device row ids to re-point onto the adopted identity. */
  repoint:   number[];
  /** Old-device row ids the canonical identity already has — delete as duplicates. */
  deleteOld: number[];
}

export function planAchievementMerge(
  oldRows:       AchievementMergeRow[],
  canonicalRows: AchievementMergeRow[],
): AchievementMergePlan {
  const plan: AchievementMergePlan = { repoint: [], deleteOld: [] };

  const canonicalIds = new Set(canonicalRows.map((c) => c.achievement_id));

  for (const old of oldRows) {
    if (canonicalIds.has(old.achievement_id)) {
      plan.deleteOld.push(old.id);
    } else {
      plan.repoint.push(old.id);
    }
  }

  return plan;
}
