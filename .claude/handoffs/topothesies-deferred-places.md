# Topothesies — Outline fidelity (deferred islands + low-detail shapes)

**Goal of this handoff:** brainstorm and try every way — with or without human
assistance — to raise the silhouette fidelity of the low-fidelity shapes until each
reads as a fair guess, then ship it. Primary targets are the **deferred islands**, but
the same work applies to any **live** shape that scores low on the fidelity signal
below. The unit list itself is settled; only outline quality remains.

## The one artifact to look at
`.claude/aiHelper/outlines-preview.html` — the whole «Νομοί & Νησιά» list as a card
gallery: each unit's silhouette + **capital** + **live / deferred / backlog** status,
with a search box and status filters. It's a **generated dev reference**. Regenerate
after any curation or geometry change:

```
TOPO_PREVIEW=1 npx tsx scripts/generateTopothesies.ts   # → source/preview-cards.json (INCLUDES deferred)
node scripts/lib/topothesies/preview-outlines.mjs        # → .claude/aiHelper/outlines-preview.html
```

`TOPO_PREVIEW=1` keeps the deferred islands (normally dropped) so their real
low-fidelity outline is visible; it writes only `preview-cards.json`, never touches the
committed `answers.json` / `shapes.json`, and skips the emit gate.

## Fidelity signal — the "pts" number (use it to triage, deferred or not)
Each card shows `id · N pts` = the vertex count of the emitted path. **Low pts = coarse
silhouette.** This is the triage metric and it is NOT limited to deferred islands — scan
low-pts *live* shapes the same way. Snapshot of the 12 coarsest today (all currently
deferred, 16–42 pts): Αγκίστρι(16), Καστελλόριζο(20), Αγαθονήσι(26), Οινούσσες(29),
Σπέτσες(29), Άγιος Ευστράτιος(32), Ανάφη(34), Λειψοί(34), Νίσυρος(36), Κίμωλος(41),
Χάλκη(41), Φολέγανδρος(42). Re-derive the current list from `preview-cards.json`.

## Current answer set (state after 2026-07-22)
- **75 live** answers (was 76). **Θεσσαλονίκη merged into Χαλκιδική** — the whole Π.Ε.
  Θεσσαλονίκης dissolves into `chalkidiki` (dense metro doesn't read as its own
  silhouette; mirrors Αθήνα/Πειραιάς → Αττική). `thessaloniki` is no longer an answer.
  `chalkidiki` is now the biggest shape (14.2 KB, under the 20 KB budget); PROXIMITY_MAX_KM
  unchanged (807).
- **29 deferred** = original 22 + **7 promoted from backlog 2026-07-22** (own-δήμος,
  peelable — `ANSWER_META` + `ISLAND_PEEL_WD` + `DEFERRED_ANSWER_IDS`, real geometry):
  Μεγανήσι, Άγιος Ευστράτιος, Φούρνοι, Τήλος, Χάλκη, Λειψοί, Αγαθονήσι. Original 22:
  `agistri anafi antiparos folegandros hydra ikaria kasos kastellorizo kimolos nisyros
  oinousses patmos poros psara samothrace serifos sikinos skiathos skopelos spetses symi syros`.
- **6 can't-peel placeholders** (`CANT_PEEL_PLACEHOLDERS`, no geometry): Κουφονήσια,
  Σχοινούσα, Ηρακλειά, Δονούσα (share δ. Νάξου), Δήλος (shares δ. Μυκόνου, uninhabited →
  no capital), Κάλαμος (shares δ. Λευκάδας). Need polygon-splitting (see below).

## Sources already tried (so we don't re-walk them)
Keep appending to this log as you try things — record source, what it gave, why it was
kept/rejected.

| # | Source | What it gave | Verdict |
|---|--------|--------------|---------|
| 1 | **geoBoundaries GRC-ADM3** (`source/geoBoundaries-GRC-ADM3.geojson`) | Municipality polygons, the original feed | Too coarse / some islands broken (e.g. Πόρος silhouette was wrong). Kept ONLY as a per-id fallback via `GEOBOUNDARIES_FALLBACK_IDS` (currently empty). |
| 2 | **OSM admin_level=7 δήμοι** via Overpass, `out geom` (`fetchOsmBoundaries.ts` → `source/osm-adm7.geojson`, 72 MB). Mirrors: `overpass.private.coffee` (primary — main `overpass-api.de` 504s on the country query), `overpass.osm.ch`, `overpass-api.de`. Joined by Wikidata QID. | Real administrative coastlines; **sharpened most islands** and is the current primary feed | Good for big islands; **insufficient for the 22 (now 29) small ones**. See the key limitation below. |

**Key limitation of source #2 (start here):** admin_level=7 is an *administrative*
boundary, not the physical coast. For a small island δήμος the admin polygon is often
generalized or drawn partly offshore, so the silhouette reads wrong however lightly we
simplify — the vertices simply aren't the coastline. This is the most likely reason the
small islands stay coarse, and it points straight at the untried avenues.

**Simplification currently applied:** absolute `interval=200` m tolerance +
`keep-shapes` (mapshaper), global for every shape; islands keep only their main landmass
(`keep=1`, `MAIN_ISLAND_POLYGONS` overrides the few that are genuinely multi-island).
Override per run with `TOPO_SIMPLIFY` (e.g. `interval=50`, or `"12%"`).

## Untried avenues to brainstorm (with / without human assistance)
Automatable (no human):
1. **Pull the real coastline, not the admin boundary.** For each island fetch OSM
   `natural=coastline` ways or the `place=island` / `place=islet` relation/way and use
   *that* geometry, keyed by the island's own Wikidata QID (distinct from the δήμος QID).
   This is the highest-leverage idea — swaps an administrative polygon for the true coast.
2. **Per-island / smaller simplify tolerance.** 200 m erases small-island detail; try a
   size-aware tolerance (tighter for small islands) via `TOPO_SIMPLIFY` and compare pts.
3. **Alternative open datasets:** GADM v4 (ADM levels), Natural Earth 10 m
   `minor_islands` / coastline, EU GISCO, Greek `geodata.gov.gr` / ΕΛΣΤΑΤ / ΟΚΧΕ
   Kallikratis shapefiles. Each has its own licence — record it if adopted (attribution
   in `attribution.ts`).
4. **Denser Overpass extract** for just the deferred set (higher-precision `out geom`,
   or resolve ways individually) rather than the one bulk country query.

May need human assistance:
5. **Manual trace / hand-cleanup** of the worst few silhouettes (operator draws or
   fixes the outline); the pipeline already supports a per-id override pattern.
6. **Operator sign-off** on borderline shapes — some may be fair guesses already once a
   real coastline is used; a human eyeball on the preview decides ship-vs-defer.

## How to graduate a deferred island → live
1. Improve its geometry (an avenue above), judge it in the preview.
2. Delete its id from `DEFERRED_ANSWER_IDS` in `confirmedSplits.ts`.
3. `npx tsx scripts/generateTopothesies.ts` (live) + the three checks
   (`npm run test -- --run`, `npx eslint .`, `npm run build`) + refresh the preview.
ANSWER_META and the peel mapping already exist, so that's the whole cost.

## Other open thread (besides fidelity): polygon-split capability
The 6 can't-peel placeholders can't be produced by the v1 attribute peel (they share a
δήμος with a bigger island). Emitting them needs connected-component splitting of a
dissolved polygon — a real pipeline feature deferred from v1. Δήλος additionally has no
capital, so even split it can't do the bonus round (likely a permanent drop). The
coastline avenue (#1) partly sidesteps this: if we source islands from `place=island`
geometry directly, the shared-δήμος problem disappears for those we can name.

## Also parked (not an island)
- **Τροιζηνία-Μέθανα** — dropped entirely (`DROP_WD` Q1536340; mainland peninsula in
  Attica's «Νήσων»). Recorded so we remember it was intentional.
