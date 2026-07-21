# Handoff — Topothesies: higher-fidelity outlines

**Status:** ready-for-agent · **Prereq:** Topothesies data emitted (`src/data/topothesies/shapes.json` exists) · **Type:** data/pipeline quality pass, no gameplay change

**Goal:** the silhouettes are too rough — corners are jagged, small islands read as crude polygons. Raise outline fidelity substantially. This is a re-tune of the **emission pipeline** only; the game logic/UI don't change.

## The enabling insight — fidelity is CHEAP here (don't throttle it)

Per **ADR 0018**, `shapes.json` is **server-only** and the route inlines **only today's one path** per day. So higher fidelity does **not** hit the client bundle or Fluid CPU — the *whole* `shapes.json` never ships. The only real budget is the **per-shape** path (the single largest silhouette must stay under the `performance.test.ts` byte budget), and even a crisp single silhouette is a few KB. **There is lots of headroom.** Do not let the old whole-file "bundle" worry keep the simplification aggressive.

## Roughness sources — attack in this order

**1. Our mapshaper `-simplify` is too aggressive (most likely the main cause).**
Locate the emission generator (under `scripts/lib/topothesies/`, the script that produced `shapes.json`). Raise the simplify retention dramatically, and switch to **Visvalingam weighted** (`-simplify weighted <high%> keep-shapes`) which preserves shape far better than the default. Consider dropping `-simplify` almost entirely and leaning on the per-shape byte budget instead. Re-emit, re-preview.

**2. Coordinate precision in `project.ts` (this is what wrecks small islands).**
Audit the decimal precision used when writing the SVG `d` coordinates. The paths are in a **shared projected space** (absolute magnitudes ~17–30), so a fixed rounding (e.g. 3 decimals) gives ~0.001 resolution — fine for Achaia, but a tiny island spanning ~0.02 units gets quantised to a handful of steps → visibly jagged. Fix by **increasing precision**, or **normalise/scale each shape into its own coordinate box before rounding** so small islands keep their detail. Prioritise this — small islands are the worst offenders and the preview will show it.

**3. Source ceiling — only if 1+2 aren't enough (bigger change, confirm with operator first).**
geoBoundaries ADM3 is itself a generalised dataset; past a point it's the ceiling. If crispness still isn't there, swap the *municipality geometry* to a higher-res open source — **OSM admin boundaries** (Overpass / a boundary extract, ODbL + attribution) or **GISCO communes/LAU** at 1:20k/1:100k (geometry only — we still reject its NUTS3 grouping). **Keep** the existing muni→RU map + `confirmedSplits`; expect a name/id **join reconciliation** like last time. New ingestion tooling / deps need operator approval (mapshaper via `npx` is already fine). Don't reopen the source unless 1+2 demonstrably fall short.

## Deliverables
- Re-tuned emission → regenerated `src/data/topothesies/shapes.json` (`answers.json` unchanged; run `validateEmitted` — id parity, GREECE_BBOX, no accents must still pass).
- Regenerate the preview: `node scripts/lib/topothesies/preview-outlines.mjs` → `scripts/lib/topothesies/source/outlines-preview.html`. Use its **outline-only** view + `pts` counts to compare before/after. **Operator signs off on quality from the gallery.**
- Keep the **per-shape byte-budget** `performance.test.ts` green — if you raise the budget, it's per-shape/worst-case (not whole-file) and justify the new number in the test comment.
- Confirm the route still inlines a **single** shape (no client-bundle regression).

## Gates & rules
- `npm run test -- --run`, `npx eslint .`, `npm run build` all green.
- ADR 0018 holds: precomputed paths, **no client projection**, daily single-shape inline.
- No new deps without approval. **Do not `git push`** (operator syncs).

## Process
Iterate: tune → re-emit → regenerate preview → eyeball → repeat. The operator will point at specific shapes that still read as rough; expect small islands to need the precision fix (#2), mainland units to need the simplify loosening (#1).
