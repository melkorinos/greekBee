# Topothesies — unpeelable islands + two shapes flagged for review

Supersedes `topothesies-deferred-places.md` (deleted). The island *fidelity* problem
is **solved and shipped**: size-aware simplification (`generateTopothesies.islandIntervalM`)
raised every small island from ~16–42 pts to ~130–400 pts, and 28 of the 29 formerly
deferred islands were graduated to live on 2026-07-22. What remains is three separate,
smaller threads.

## Current state (2026-08-06)
- **104 live answers.** The graduated islands use real OSM admin geometry at
  island-size-aware tolerance; no coastline fetch was ever needed (an island δήμος
  boundary *is* the coastline — the source was never the problem).
- `PROXIMITY_MAX_KM = 938` in `src/config/gameRules.ts` — unchanged through both the
  Θεσσαλονίκη drop and the Πόρος graduation, because Καστελλόριζο (the easternmost point
  of Greece) still sets it. If the answer set changes again, re-read the pipeline's
  printed value and update this.
- `DEFERRED_ANSWER_IDS` is **empty** — Πόρος, the last holdout, graduated (Thread 1).
- Max shape path 12.2 KB (euboea, now that chalkidiki lost the Θεσσαλονίκη metro),
  under the 20 KB per-shape budget.

## How the pipeline works now (context for any fix here)
- `scripts/generateTopothesies.ts`: dissolve δήμοι by answer id → **bucket each shape by
  its own km size** → one mapshaper `-simplify interval=N` pass per bucket. Mainland &
  big islands stay 200 m; small islands drop to 30 m. `TOPO_SIMPLIFY=…` forces one spec
  on every shape for experiments.
- **The source dumps are gitignored, so a fresh clone must re-fetch before regenerating:**
  `fetchWikidata.ts` (fast) then `fetchOsmBoundaries.ts` (~69 MB, mirrors flaky — the first
  two returned 502 and a near-empty body on 2026-08-06 before the third worked). The δήμος →
  regional-unit join is **by Wikidata QID**; `fetchWikidata.ts` had silently stopped emitting
  that `q` field, so the join matched 0 of 452 and everything fell through to spatial-nearest
  guessing. Fixed 2026-08-06. If a regeneration ever produces wild reassignments, check that
  `wd-munis.json` rows still carry `q` first.
- Preview: `TOPO_PREVIEW=1 npx tsx scripts/generateTopothesies.ts` then
  `node scripts/lib/topothesies/preview-outlines.mjs` → `.claude/aiHelper/outlines-preview.html`
  (includes deferred + placeholder cards).
- **Which landmass an answer draws is chosen by its CAPITAL, not by area** —
  `project.polygonsBestFirst` puts the polygon containing `ANSWER_META.capitalCoord`
  first, then the rest by descending area, and `MAIN_ISLAND_POLYGONS`/`keep` slices off
  the front. Falls back to pure area when the capital is in no polygon. This is the tool
  the threads below turned out to need; the `place=island` coastline override was
  investigated and is **not needed** (see Thread 1).

## Thread 1 — Πόρος ✅ RESOLVED 2026-08-06 (graduated; the diagnosis was wrong)
The suspected cause — "the admin δήμος polygon doesn't match the island" — was **false**.
Δήμος Πόρου's dump contains the correct island outline, byte-identical to the OSM
`place=island` relation Q724394. The real fault was in our own pipeline: the δήμος has 15
polygons, and its **mainland** strip of Argolid coast (24.3 km²) is fractionally larger
than the island (22.4 km²), so the `keep=1` "draw the largest polygon" rule drew the
mainland hook. That is the unrecognisable C-shape that got Πόρος deferred.
- **Fixed by** `project.polygonsBestFirst` — choose the polygon holding the answer's
  capital, then order the rest by area. Πόρος now renders as the real island (362 pts) and
  is graduated; `DEFERRED_ANSWER_IDS` is empty. 104 answers, `PROXIMITY_MAX_KM` still 938.
- **The rule is a no-op for all 69 other islands** — verified by diffing every emitted
  shape. For everything else the largest polygon already was the capital's polygon.
- **The `place=island` override was not built and is not needed.** It would have worked,
  but it costs a second network source and a per-island QID table (the island's QID differs
  from the δήμος's — Πόρος island Q724394 vs δήμος Q3908531) to fix a bug that was ours.
  If a future island genuinely lacks usable admin geometry, the avenue is still open.

## Thread 2 — Χαλκιδική ✅ RESOLVED 2026-08-06 (un-merged, Θεσσαλονίκη dropped)
The suspicion was right: the 2026-07-22 Θεσσαλονίκη merge buried Χαλκιδική's recognisable
three-finger peninsula under the metro lobe. All three candidates were rendered from OSM and
judged by eye (the throwaway preview is not kept — the verdict below is the record).
Χαλκιδική alone is unmistakable; Θεσσαλονίκη alone is a shapeless blob, which *confirms* the
original "doesn't read as its own silhouette" rationale rather than refuting it.
- **Decided:** un-merge, and **drop Θεσσαλονίκη entirely** — it does not return as
  `thessaloniki`. The metro simply is not a puzzle. Precedent: Τροιζηνία-Μέθανα. Accepted
  cost: no answer covers that territory, and the easy Θεσσαλονίκη capital round is gone.
- **Done:** `RU_TO_ID` entry removed, `MUNI_RU_FIX_WD` Q6627746 moved to `DROP_WD`,
  regenerated. Still 103 answers, `chalkidiki` 845 → 607 pts, `PROXIMITY_MAX_KM` unchanged
  at 938 (Καστελλόριζο still sets it), max path is now `euboea` not `chalkidiki`.

## Thread 3 — the 6 can't-peel placeholders (need polygon-split capability)
`CANT_PEEL_PLACEHOLDERS` in `confirmedSplits.ts` — islands that share a δήμος with a
larger island, so an attribute peel by QID can't produce them. They have no
ANSWER_META / geometry and render as flagged placeholder cards in the preview:
- Κουφονήσια (Άνω Κουφονήσι), Σχοινούσα, Ηρακλειά, Δονούσα — all share **δ. Νάξου**.
- Δήλος — shares **δ. Μυκόνου**; uninhabited, **no capital**, so even if split it can't
  do the capital bonus round (likely a permanent drop).
- Κάλαμος — shares **δ. Λευκάδας**.

**No polygon-splitting feature is needed — they are already separate polygons.** A
δήμος that spans several islands arrives from OSM as a MultiPolygon with one polygon per
island; nothing has to be *split*, only *selected*. Probed 2026-08-06 with
`project.pointInPolygon` against each placeholder's capital:

| Island | Result |
|---|---|
| Κουφονήσια | ✅ own polygon — 5.7 km², 1864 pts |
| Σχοινούσα | ✅ own polygon — 8.1 km², 1719 pts |
| Ηρακλειά | ✅ own polygon — 18.0 km², 1582 pts |
| Δονούσα | ✅ own polygon — 13.4 km², 1971 pts |
| Κάλαμος | ✅ polygon is there (25.4 km², in δ. Λευκάδας) but the probe's guessed capital coordinate sat 0.4 km offshore — **needs a real `capitalCoord` confirmed**, not new machinery |
| Δήλος | ❌ uninhabited, no capital, so no point to select by and no capital bonus round — the permanent-drop candidate it was always suspected to be |

So ticket 05's blocking question is answered: **five of the six are peelable today**, by
giving each an `ANSWER_META` entry with a real `capitalCoord` and selecting its polygon
out of the parent. The remaining work is curation (capital coordinates, aliases, and
deciding whether islands this small are fair guesses), not pipeline capability. Note the
parent answer keeps its own polygons — a peeled island must also be *removed* from the
parent, which the current code does not do.

## Also parked (not an island, recorded so it's not re-litigated)
- **Τροιζηνία-Μέθανα** — dropped entirely (`DROP_WD` Q1536340; mainland peninsula in
  Attica's «Νήσων»). Intentional.
