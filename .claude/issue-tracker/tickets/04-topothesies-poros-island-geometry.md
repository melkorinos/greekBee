# Topothesies: does the `place=island` override fix Πόρος?

**Parent:** [MAP — Public launch readiness](00-MAP-public-launch-readiness.md)
**Label:** `wayfinder:task`
**Status:** ready-for-agent
**Assignee:** _(unclaimed)_

## Question

Does a per-id `place=island` coastline override produce a Πόρος silhouette that reads right —
and if so, does the override mechanism generalise to the placeholder islands?

From `.claude/handoffs/topothesies-unpeelable-and-review.md` thread 1: `poros` (δήμος QID
`Q3908531`, `ISLAND_PEEL_WD`) is the **only** island not graduated on 2026-07-22 — the other 28
went live. At the new size-aware tolerance it reaches ~128 pts, so simplification is not the
problem; the admin δήμος polygon likely does not match the recognisable island outline (Πόρος
sits in a narrow channel off the Argolid, so the δήμος may capture the wrong landmass or an
offshore boundary).

**The fix to try is already prototyped.** A throwaway prototype in that session proved the
approach: OSM `place=island` by a tight bbox around the island's capital, name-matched, largest
polygon, via the Overpass mirror `overpass.private.coffee`. **Trap:** the island's own Wikidata
QID differs from the δήμος QID (e.g. Αγκίστρι island `Q539983` vs δήμος `Q20917269`) — do not
reuse the δήμος QID.

Wire it as a **source override keyed by answer id**, mirroring the existing
`GEOBOUNDARIES_FALLBACK_IDS` pattern in the pipeline.

This is a `task` ticket, not a build ticket: it does real work, but its purpose is to answer
whether the override mechanism works. That answer is what unblocks the placeholder-islands
decision, which currently has no way to proceed at all.

**Resolution shape.** Judge in the preview (`TOPO_PREVIEW=1 …` then `preview-outlines.mjs`).
- If Πόρος reads right: remove `poros` from `DEFERRED_ANSWER_IDS`, regenerate, **re-check
  `PROXIMITY_MAX_KM`** in `src/config/gameRules.ts` (currently 938), and record in the answer
  that the override generalises.
- If it does not: record why, and Πόρος stays deferred — that is a legitimate resolution.

Either way the answer must state plainly **whether the override is a reusable tool**, because
[the placeholder islands ticket](05-topothesies-cant-peel-placeholders.md) is blocked on
exactly that fact.
