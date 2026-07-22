// planDissolve — the split-mapping planner for the Topothesies data pipeline.
//
// Pure: municipality records + an override map in, a target-assignment plan out.
// It decides which TARGET entry each Kallikratis municipality dissolves into;
// mapshaper then does the actual geometry dissolve keyed by these assignments.
//
// Rules (handoff-01 "Island splits" — locked):
//   • override present  → the municipality peels into that island entry
//   • no override       → it dissolves into its regional-unit target (so a
//                         Deferred island sharing a parent municipality stays
//                         inside the parent — it simply has no override)
//   • dropped           → excluded from every target (non-islands like
//                         Troizinia-Methana). A drop wins over any override.

export interface MunicipalityRecord {
  /** Municipality name as it appears in the Kallikratis source attributes. */
  name: string;
  /** Parent regional-unit attribute value. */
  regionalUnit: string;
}

export interface DissolveConfig {
  /** municipality name → target entry id (island peels + explicit remainders). */
  overrides: Record<string, string>;
  /** municipality names dropped entirely (non-islands). Wins over an override. */
  drops: Iterable<string>;
  /** default target id for a municipality with no override (its regional unit). */
  unitToTargetId: (regionalUnit: string) => string;
}

export interface DissolvePlan {
  /** municipality name → target entry id. Dropped municipalities are absent. */
  assignments: Record<string, string>;
  /** municipality names excluded from every target. */
  dropped: string[];
  /** distinct target ids produced, sorted. */
  targetIds: string[];
}

export function planDissolve(
  municipalities: MunicipalityRecord[],
  { overrides, drops, unitToTargetId }: DissolveConfig,
): DissolvePlan {
  const dropSet = new Set(drops);
  const assignments: Record<string, string> = {};
  const dropped: string[] = [];
  const targets = new Set<string>();

  for (const muni of municipalities) {
    if (dropSet.has(muni.name)) {
      dropped.push(muni.name);
      continue;
    }
    const target = overrides[muni.name] ?? unitToTargetId(muni.regionalUnit);
    assignments[muni.name] = target;
    targets.add(target);
  }

  return { assignments, dropped, targetIds: [...targets].sort() };
}
