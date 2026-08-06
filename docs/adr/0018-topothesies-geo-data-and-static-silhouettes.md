# ADR 0018 — Topothesies: regional-unit silhouettes from static CC-BY geodata

**Status**: Accepted — **amended 2026-08-06** (see "Amendments" at the end). The
data source, the landmass-selection rule and the "no polygon splitting" limit have
all moved since this was written; decisions 1, 2 and `PROXIMITY_MAX_KM` below are
superseded there. Everything else still holds.

## Context

Topothesies is a new game category: a **Worldle-style Greek geography game**. The
player sees the **silhouette** of a Greek **regional unit** (περιφερειακή
ενότητα) and guesses it (Stage 1, 4 guesses), then its **capital** (Stage 2,
3 bonus guesses). After each wrong guess the game shows distance (km) +
8-way direction + proximity %, scaled to the dataset's real max pairwise
centroid distance.

This is the platform's first move from "Greek **word** games" to "Greek
**games**", and its first game backed by geographic boundary data rather than
the dictionary. Two questions had to be settled before any code: what admin
level the answers are, and how geometry reaches the player without adding a
runtime cost the platform explicitly avoids (soul.md Fluid-CPU rule).

## Decision

**1. Answers are regional units, split into per-island entries where a unit is a
cluster of separately-recognizable islands.** The curated set is ~70–90 entries,
not a fixed ~40. Splitting is **municipality-clean only** in v1: an island
becomes its own entry only if it is a separate municipality (a clean attribute
peel). Islands that share a municipality with a larger island, or are too small
to be a fair guess, are **Deferred** — parked inside their parent shape and
recorded, never silently merged. The confirmed splits are locked (see
`scripts/lib/topothesies/confirmedSplits.ts`); the remaining per-cluster island
lists are DRAFT pending operator line-by-line sign-off. No polygon-level geometry
splitting in v1.

**2. Data source is geodata.gov.gr (Kallikratis boundaries), CC-BY.** Commercial
use is permitted **with attribution**; the attribution string is a config
constant consumed by the info modal. GADM is **banned** (non-commercial).

**3. The pipeline is build-time and static — zero server-side geo compute.** A
committed `tsx` script (matching ADR 0015 style) ingests the municipality
boundaries, **dissolves** municipalities → target entries via a per-unit override
map (`planDissolve`), **simplifies** (mapshaper), computes centroids, and emits
two static files to `src/data/topothesies/`:
- `shapes.json` — one entry per id: a **precomputed SVG `path` string + `viewBox`**.
- `answers.json` — names, `*Normalized` (accent-free), capital + `capitalCoord`,
  `centroid`, `aliases`, `region`, `isIsland`.

The split-mapping (`planDissolve`) and the emitted-data validator
(`validateEmitted`) are pure and unit-tested; the validator is the gate the two
files must pass before commit (id parity, confirmed splits present, coords in
Greece's bbox, no accents in `*Normalized`).

**4. Geometry is precomputed SVG paths, never client-side projection.** The
client never ships raw GeoJSON and never runs d3-geo/a projection. This avoids a
dependency and per-visit CPU for a purely deterministic daily puzzle.

**5. Bundle/CPU stay flat regardless of entry count.** Because there is exactly
one deterministic daily puzzle, the route is **statically rendered per day with
`revalidate`** (the Leksokipos session-71 prerender / session-64 chunk-reduction
pattern), and only **today's** path is inlined. The full `shapes.json` set is a
build-time asset that never reaches the client wholesale. Autocomplete bundles
**names only** (a few KB) — it never needs other entries' geometry, because
hints come from centroids, not paths.

## Consequences

- mapshaper is a new (dev-only) dependency; prefer `npx` without a saved dep, and
  get operator approval before installing (CLAUDE.md: no new deps without
  approval).
- The real municipality→id override map and all curation (capitals, coords,
  aliases, the DRAFT cluster splits) are filled once the shapefile is in hand and
  the operator signs off — this ADR's foundation ships before that.
- `PROXIMITY_MAX_KM` in `gameRules.ts` is a `TODO` until the pipeline computes the
  dataset's max pairwise centroid distance.
- Platform identity widens to "Greek games"; Topothesies ships `wip:true` with a
  TBD display name (`topothesies` is the permanent internal id).

---

## Amendments

### 2026-08-06 — the answer set, the source, and how a landmass gets chosen

The knowledge below outlived three handoff documents. It lives here because
nothing else in the repo records it and the pipeline is unusable without it.

**Source is OpenStreetMap `admin_level=7` δήμοι (ODbL), not geodata.gov.gr
(supersedes decision 2).** Swapped in session 119 — geodata.gov.gr went dead and
geoBoundaries ADM3 read poorly. The δήμος → regional-unit join is **by Wikidata
QID** (`curation.assignOsm`), not by name. geoBoundaries survives only as a
per-id escape hatch (`GEOBOUNDARIES_FALLBACK_IDS`, currently empty); if it is ever
used again its second attribution line must be restored in `attribution.ts`.

**The source dumps are gitignored, so a fresh clone must re-fetch before it can
regenerate anything:** `npx tsx scripts/lib/topothesies/fetchWikidata.ts` (fast),
then `npx tsx scripts/lib/topothesies/fetchOsmBoundaries.ts` (~69 MB, mirrors are
flaky — on 2026-08-06 the first returned 502 and the second a near-empty body
before the third worked). Expect a few unrelated shapes to shift by 1–3 vertices
from upstream OSM edits; that is jitter, not breakage — confirm the centroids did
not move before accepting it.

**The QID field is a silent single point of failure.** `fetchWikidata.ts` once
stopped emitting the `q` field its output rows are joined on, and the join matched
0 of 452 δήμοι — every municipality then fell through to spatial-nearest guessing,
which produces a plausible-looking map that is wrong. Fixed 2026-08-06. **If a
regeneration ever produces wild reassignments, check that `wd-munis.json` rows
still carry `q` before theorising about anything else.**

**Which landmass an answer draws is chosen by its CAPITAL, not by area.**
`project.polygonsBestFirst` puts the polygon containing `ANSWER_META.capitalCoord`
first and orders the rest by descending area; `MAIN_ISLAND_POLYGONS` (default 1
for every island) slices off the front. Area alone drew Δήμος Πόρου's strip of
Argolid coast (24.3 km²) instead of the island (22.4 km²) — an unrecognisable
C-shape that had Πόρος deferred for months on a misdiagnosis. The rule is a no-op
for every other island, verified by diffing all emitted shapes.

**Polygon-level peels exist (supersedes decision 1's "no polygon-level geometry
splitting in v1").** Islands sharing their parent's δήμος are peeled by
`POLYGON_PEELS` after the dissolve. **Nothing is split**: a δήμος spanning several
islands arrives from OSM as a MultiPolygon with one polygon per island, so the
child is *selected* out and removed from the parent. The connected-component
splitting this was assumed to require was never required. Selection is
`project.selectPeelPolygons` — the capital's polygon, then the largest polygons
**smaller than it**; it returns null (and the generator throws) rather than guess.
Both looser rules were tried and shipped wrong answers: ordering the rest by area
gave Κουφονήσια the island of Νάξος, and ordering by proximity gave it a 0.15 km²
rock instead of Κάτω Κουφονήσι.

**`PROXIMITY_MAX_KM` = 938**, set by Καστελλόριζο as the easternmost point of
Greece, and unmoved by every answer-set change since. It is no longer a TODO. The
generator prints the value it should have on every run — re-read it after any
change to the answer set rather than assuming.

**The answer set is 109** and the «Νομοί και Νησιά της Ελλάδας» reconciliation is
complete: `DEFERRED_ANSWER_IDS`, `DEFERRED_ISLANDS` and `CANT_PEEL_PLACEHOLDERS`
are all empty. They are kept as one-line levers, not as backlog.

### Closed verdicts — recorded so they are not re-opened

- **Πόρος — graduated.** The bug was ours, not OSM's: the δήμος dump contained the
  correct island all along (byte-identical to the `place=island` relation Q724394);
  the "largest polygon" rule drew the mainland. The `place=island` coastline
  override that three documents proposed was **never built and is not needed** — it
  would cost a second network source and a per-island QID table to fix our bug. The
  avenue stays open if an island ever genuinely lacks usable admin geometry.
- **Θεσσαλονίκη — dropped entirely.** Merged into Χαλκιδική in 2026-07 because the
  dense metro does not read as its own silhouette; un-merged 2026-08-06 because the
  merge buried Χαλκιδική's three-finger peninsula. Rendering all three candidates
  settled it: Χαλκιδική alone is unmistakable, Θεσσαλονίκη alone is a shapeless
  blob. It does **not** return as its own answer. Accepted cost: no answer covers
  that territory.
- **Τροιζηνία-Μέθανα — dropped entirely** (`DROP_WD` Q1536340). A mainland
  peninsula inside Attica's «Νήσων» unit, so neither a unit nor an island.
- **Δήλος — permanent drop** (operator, 2026-08-06). Uninhabited, no capital, and
  the capital stage is required of every answer. Peelable; that was never the
  question.
- **Καστός — deliberate omission** (operator, 2026-08-06). Shares Δήμος Λευκάδας
  with Κάλαμος and would peel identically, but sits an order of magnitude below the
  recognisability floor of every live answer.
