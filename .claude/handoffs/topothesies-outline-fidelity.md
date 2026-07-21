# Handoff — Topothesies: higher-fidelity outlines

**Status:** phase 1 done · **phase 2 (source swap) ready-for-agent** · **Type:** data/pipeline quality pass, no gameplay change

**Goal:** crisper regional-unit / island silhouettes. The emission pipeline is re-tuned; game logic/UI don't change (ADR 0018 holds: precomputed paths, no client projection, one shape/day inlined).

---

## Phase 1 — DONE (2026-07-21). Everything geoBoundaries can give, extracted.

The emission pipeline (`scripts/generateTopothesies.ts` + `scripts/lib/topothesies/`) was tuned to the geoBoundaries ADM3 ceiling:

- **Simplify → 100%** (`TOPO_SIMPLIFY` default, was 25%). No simplification: every source vertex is kept. Αγκίστρι went 6 → 17 (70%) → **37 pts** (100% = its full source vertex count).
- **Coordinate precision 3 → 4 dp** in `project.ts` `ringToPath` — de-jaggs the smallest islands.
- **Per-shape byte budget 6 KB → 12 KB** in `src/test/shared/performance.test.ts`. This is a per-shape / worst-case ceiling, never whole-file (only one path ships/day). Largest silhouette (Εύβοια) is now ~10.3 KB.
- **`MAIN_ISLAND_POLYGONS`** (new, in `confirmedSplits.ts`) — for a curated list of islands, keep only the N largest polygons by area (drops satellite islets so the main island self-frames zoomed-in). N=1 for most; N=2 for Αλόννησος (Alonnisos + Peristera). Applied before both the path and the centroid so the drawn shape and the proximity centroid match.
- **Πόρος deferred** — its geoBoundaries silhouette doesn't read as the real island. Dropped from `ISLAND_OVERRIDES` + `ANSWER_META`, removed from `CONFIRMED_SPLIT_IDS`, recorded in `DEFERRED_ISLANDS` + `topothesies-deferred-places.md`. Promote it back once a higher-res source lands (phase 2).

**Result:** 100 shapes. 12 are still under 40 pts, and **every one is at the geoBoundaries source ceiling** — the vertices simply don't exist in the source, so no pipeline knob recovers them. The shortlist (pts at 100%):

`kastellorizo(11) · nisyros(18) · spetses(23) · oinousses(26) · psara(26) · kimolos(32) · sikinos(32) · folegandros(34) · antiparos(35) · hydra(36) · agistri(37) · paxi(37)`

Plus Πόρος, parked pending this same source swap.

---

## Phase 2 — READY FOR AGENT: swap the small-island geometry to a higher-res source

**The decision is made:** pursue the "more geometric detail" path (operator sign-off 2026-07-21). geoBoundaries ADM3 is a generalised dataset and is the hard ceiling above; the only way past it is real coastline geometry.

**What is guaranteed:** OSM admin boundaries (Overpass / ODbL, attribution required) or GISCO communes/LAU at 1:20k–1:100k carry real coastlines — a tiny island geoBoundaries stores in 11–37 vertices comes in with hundreds. On the "more points = more recognizable" axis this reliably delivers, incl. the currently hard-capped Καστελλόριζο and Πόρος.

**What is NOT guaranteed — the join.** A new source names/IDs municipalities differently from geoBoundaries, so the whole `muni → answer id` machinery must be re-reconciled by hand: `ISLAND_OVERRIDES`, `RU_TO_ID`, `RU_FIX`, and the `confirmedSplits` locks (`curation.ts`). Expect name-matching mismatches to chase down — the same slog the original v1 ingestion hit. This is a real ingestion project, not a config bump.

### Recommended scope — swap ONLY the coarse shortlist, not all 100
Do **not** re-ingest all 100 units. The mainland units and large islands are already crisp from geoBoundaries and their join is settled. Replace geometry **only** for the ~13 source-capped islands above (+ Πόρος). Concretely:
- Fetch higher-res polygons for just those island municipalities from OSM/GISCO.
- Splice them into the pipeline as a per-id geometry override that runs **before** dissolve/simplify — keep the existing geoBoundaries feed for everything else. This localises the join reconciliation to ~14 names instead of 325.
- Re-emit; the `MAIN_ISLAND_POLYGONS` satellite-islet filter (keep N largest polygons) will likely need per-island re-tuning, since polygon counts/areas change with the new source.
- **Πόρος:** re-add to `ISLAND_OVERRIDES` + `ANSWER_META` + `CONFIRMED_SPLIT_IDS`, remove its `DEFERRED_ISLANDS` entry, and update `topothesies-deferred-places.md` **only if** the new silhouette actually reads correctly — operator eyeballs the preview first.

### If instead a full source swap is chosen
Keep the existing muni→RU map + `confirmedSplits`; expect a full name/id join reconciliation like v1. Still reject GISCO's NUTS3 grouping — geometry only.

## Deliverables
- New ingestion tooling under `scripts/lib/topothesies/` (needs operator approval for any new dep; `npx mapshaper` is already fine). Raw source dumps stay gitignored in `source/` (builds hermetic — ADR 0018).
- Regenerated `src/data/topothesies/shapes.json` (`answers.json` changes only if Πόρος returns / centroids move). Run `validateEmitted` — id parity, GREECE_BBOX, no accents must still pass.
- Regenerate preview: `node scripts/lib/topothesies/preview-outlines.mjs` → `source/outlines-preview.html`. **Operator signs off on quality from the gallery** (outline-only toggle + `pts` counts).
- Keep `performance.test.ts` per-shape budget green (raise + justify only if a genuinely larger single silhouette needs it).
- If `PROXIMITY_MAX_KM` changes, the generator prints the new value — update `gameRules.TOPOTHESIES.PROXIMITY_MAX_KM`.

## Gates & rules
- `npm run test -- --run`, `npx eslint .`, `npm run build` all green.
- ADR 0018 holds: precomputed paths, **no client projection**, daily single-shape inline.
- No new deps without approval. **Do not `git push`** (operator syncs).

## Process
Iterate: fetch → splice → re-emit → regenerate preview → operator eyeballs → repeat. Expect the join reconciliation (#not-guaranteed above) to be the bulk of the work, not the geometry.
