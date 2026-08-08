// generateTopothesies.ts — the one-time, local data generator for Topothesies.
//
// Like `generate-leksoplegma`, this is run by hand and its OUTPUT is committed
// (src/data/topothesies/{answers,shapes}.json); the raw OSM / Wikidata dumps it
// reads stay gitignored in scripts/lib/topothesies/source/ (ADR 0018 — builds
// stay hermetic, no route depends on the geometry source being reachable).
//
// Geometry source = OpenStreetMap admin_level=7 δήμοι (Overpass `out geom`,
// ODbL). Each δήμος is assembled into a polygon (osmPolygons.ts), assigned to an
// answer id by its Wikidata QID (curation.assignOsm — peels/drops/RU-fix by QID,
// regional unit from wd-munis.json parentEl), then dissolved to one shape/answer.
//
// A per-id FALLBACK to the old geoBoundaries source is available for any answer
// whose OSM silhouette the operator rejects: list its id in
// GEOBOUNDARIES_FALLBACK_IDS below and it is sourced from geoBoundaries instead
// (and its second attribution line must be restored in attribution.ts).
//
// Pipeline: assign OSM δήμοι → mapshaper dissolve2 + simplify → project to
// precomputed SVG paths + area-weighted centroids (project.ts) → emit the two
// files → validateEmitted gate, and print the max pairwise centroid km for
// gameRules.TOPOTHESIES.PROXIMITY_MAX_KM.
//
//   npx tsx scripts/generateTopothesies.ts

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { normalizeLetters } from "../src/lib/normalize";
import { haversineKm } from "../src/games/topothesies/lib/geo";
import type { LngLat, TopothesiesAnswer, TopothesiesShape } from "../src/games/topothesies/types";
import {
  ANSWER_META,
  assignOsm,
  assignTarget,
  DROP_WD,
  ISLAND_PEEL_WD,
  MUNI_RU_FIX_WD,
} from "./lib/topothesies/curation";
import { assembleOverpass } from "./lib/topothesies/osmPolygons";
import {
  centroidLngLat,
  computeViewBox,
  maxPairwiseCentroidKm,
  polygonsBestFirst,
  projectPoint,
  ringArea,
  ringToPath,
  selectPeelPolygons,
} from "./lib/topothesies/project";
import { validateEmitted } from "./lib/topothesies/validateEmitted";
import {
  CANT_PEEL_PLACEHOLDERS,
  CONFIRMED_SPLIT_IDS,
  DEFERRED_ANSWER_IDS,
  MAIN_ISLAND_POLYGONS,
  POLYGON_PEELS,
} from "./lib/topothesies/confirmedSplits";

// Preview build (TOPO_PREVIEW=1): emit EVERY answer — including the deferred
// islands normally excluded from the live game — into a single self-contained
// preview-cards.json (gitignored, in source/) so preview-outlines.mjs can render
// the whole «Νομοί & Νησιά» list with each shape's real (low-fidelity) outline,
// its capital, and a live/deferred/placeholder status. It does NOT touch the
// committed answers.json / shapes.json and skips the validateEmitted gate.
const PREVIEW = process.env.TOPO_PREVIEW === "1";

const SRC = path.join(__dirname, "lib/topothesies/source");
const OUT = path.join(__dirname, "../src/data/topothesies");
const TMP = path.join(__dirname, "lib/topothesies/source/_tagged.geojson");
const DISSOLVED = path.join(__dirname, "lib/topothesies/source/_dissolved.geojson");

// Answer ids to source from the old geoBoundaries feed instead of OSM (per-id
// fallback for any silhouette the operator judges worse under OSM). Empty = pure
// OSM (single ODbL credit). Any id added here must have its geoBoundaries
// attribution line restored in src/games/topothesies/attribution.ts.
const GEOBOUNDARIES_FALLBACK_IDS: ReadonlySet<string> = new Set([]);

// Simplification is SIZE-AWARE. OSM coastlines are dense (a δήμος carries
// thousands of vertices) so we simplify DOWN with an absolute ground-distance
// tolerance (interval, metres). But a SINGLE global tolerance can't serve both a
// 180 km νομός and a 3 km islet: interval=200 keeps the mainland under the
// per-shape byte budget yet sands small islands down to ~18 vertices — the "low
// fidelity" the small deferred islands suffered (an island δήμος boundary already
// *is* the coastline, so the source was never the problem; the tolerance was).
//
// So the tolerance scales with each shape's own size. MAINLAND is left untouched
// at 200 m (already high-fidelity, and must stay under budget). ISLANDS get a
// finer tolerance the smaller they are — 30 m for the small ones (Αγκίστρι,
// Καστελλόριζο …), still 200 m for big islands (Εύβοια, Λέσβος, Ρόδος) which read
// well already and would otherwise blow the byte budget. Bucketed to a few
// discrete intervals so all shapes in one bucket simplify in a single mapshaper
// pass. `keep-shapes` stops small islands collapsing. Only one shape ships per
// day (ADR 0018), so the budget is a per-shape worst case. TOPO_SIMPLIFY forces
// ONE spec on every shape (e.g. "interval=300", or "12%") for experiments / A-B.
const SIMPLIFY_OVERRIDE = process.env.TOPO_SIMPLIFY ?? null;

/** Island-only, size-aware tolerance: km diagonal of the drawn landmass → interval m. */
function islandIntervalM(diagKm: number): number {
  if (diagKm < 12) return 30; // islets (Αγκίστρι, Καστελλόριζο, Αγαθονήσι, Σπέτσες…)
  if (diagKm < 30) return 60; // small islands (Σύρος, Πάρος, Αίγινα…)
  if (diagKm < 50) return 120; // medium islands (Νάξος, Σάμος, Κεφαλονιά…)
  return 200; // big islands (Εύβοια, Λέσβος, Ρόδος, Χίος…) — unchanged
}

// Distance (in degrees) beyond which an OSM δήμος's nearest wd-muni is treated as
// a foreign border municipality inside the bbox and dropped.
const FOREIGN_DEG = 0.12;

interface Muni {
  q: string;
  coord: LngLat | null;
  parentEl: string | null;
}
type Ring = LngLat[];
type Polygon = Ring[];
interface Feature {
  properties: Record<string, string>;
  geometry:
    | { type: "Polygon"; coordinates: Polygon }
    | { type: "MultiPolygon"; coordinates: Polygon[] };
}

function roughCentroid(f: Feature): LngLat {
  const rings =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates[0]]
      : f.geometry.coordinates.map((p) => p[0]);
  let x = 0;
  let y = 0;
  let n = 0;
  for (const r of rings) for (const [lng, lat] of r) { x += lng; y += lat; n++; }
  return [x / n, y / n];
}

/** Each dissolved feature's geometry as an array of polygons (rings-first). */
function polygonsOf(f: Feature): Polygon[] {
  return f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
}


/** A polygon's outer-ring area in km² — diagnostics only, so the peel log is readable. */
function polygonKm2(polygon: Polygon): number {
  const ring = polygon[0];
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return Math.abs(ringArea(ring)) * 110.574 * 111.32 * Math.cos((lat * Math.PI) / 180);
}

/**
 * Peel POLYGON_PEELS children out of their parent's dissolved geometry.
 *
 * Runs AFTER the dissolve because these islands share their parent's δήμος —
 * there is no attribute to key on at tagging time (that is what ISLAND_PEEL_WD
 * does). No splitting is involved: a δήμος spanning several islands arrives from
 * OSM as one polygon per island, so the child's polygons are SELECTED by its
 * capital and REMOVED from the parent. Removal matters — a child left in both
 * would be drawn twice and would drag the parent's centroid toward it.
 *
 * The child's FIRST polygon is the one holding its capital, and a capital inside no
 * polygon THROWS — never falls back to area the way `polygonsBestFirst` does, since
 * here that would hand the child its parent's main landmass.
 *
 * A child taking more than one polygon takes the largest of those SMALLER THAN its
 * capital's — its own satellites. Both looser rules were tried and are wrong:
 * next-nearest picks the 0.15 km² rock 2.3 km off Άνω Κουφονήσι over Κάτω
 * Κουφονήσι (3.85 km², 4.2 km away), and next-largest picks ΝΑΞΟΣ (429 km²),
 * which silently strips the parent of its own island. A peeled island's siblings
 * are by definition not bigger than it is.
 */
function applyPolygonPeels(features: Feature[]): Feature[] {
  const childrenOf = new Map<string, { id: string; polygons: number }[]>();
  for (const [id, peel] of Object.entries(POLYGON_PEELS)) {
    if (!childrenOf.has(peel.parent)) childrenOf.set(peel.parent, []);
    childrenOf.get(peel.parent)!.push({ id, polygons: peel.polygons });
  }

  const out: Feature[] = [];
  for (const f of features) {
    const children = childrenOf.get(f.properties.ansid);
    if (!children) { out.push(f); continue; }

    let remaining = polygonsOf(f);
    for (const child of children) {
      const meta = ANSWER_META[child.id];
      if (!meta) { console.warn(`peel "${child.id}": no ANSWER_META — skipped`); continue; }
      const capital = meta.capitalCoord;
      const taken = selectPeelPolygons(remaining, capital, child.polygons);
      if (!taken) {
        throw new Error(
          `peel "${child.id}": could not take ${child.polygons} polygon(s) out of ` +
            `"${f.properties.ansid}" with capitalCoord ${JSON.stringify(capital)} — either the ` +
            `coordinate is offshore, or too few of the parent's islands are smaller than it`,
        );
      }
      remaining = remaining.filter((p) => !taken.includes(p));
      console.log(
        `peel ${child.id} ← ${f.properties.ansid}: took ${taken
          .map((p) => `${polygonKm2(p).toFixed(1)} km²`)
          .join(" + ")}, ${remaining.length} polygon(s) left on the parent`,
      );
      out.push({
        properties: { ansid: child.id },
        geometry: { type: "MultiPolygon", coordinates: taken },
      });
    }
    out.push({
      properties: f.properties,
      geometry: { type: "MultiPolygon", coordinates: remaining },
    });
  }
  return out;
}

/** Nearest wd-muni regional unit to a point (spatial fallback + foreign filter). */
function nearestMuniRu(c: LngLat, munis: Muni[]): { parentEl: string | null; dist: number } {
  let best: Muni | null = null;
  let bd = Infinity;
  for (const m of munis) {
    if (!m.coord) continue;
    const dx = c[0] - m.coord[0];
    const dy = c[1] - m.coord[1];
    const dd = dx * dx + dy * dy;
    if (dd < bd) { bd = dd; best = m; }
  }
  return { parentEl: best?.parentEl ?? null, dist: Math.sqrt(bd) };
}

/** OSM δήμοι tagged with their answer id (ansid), foreign/dropped removed. */
function taggedFromOsm(munis: Muni[], byQ: Map<string, Muni>, skip: ReadonlySet<string>): Feature[] {
  const json = JSON.parse(fs.readFileSync(path.join(SRC, "osm-adm7.geojson"), "utf8"));
  const out: Feature[] = [];
  let dropped = 0;
  let foreign = 0;
  for (const feat of assembleOverpass(json)) {
    const wd = feat.properties.wikidata;
    // Peels / drops / RU-fixes resolve from the QID alone — settle them before
    // any regional-unit lookup so a remote peel (e.g. Καστελλόριζο) is never
    // foreign-dropped for having no nearby wd-muni.
    const qidDirect = wd != null && (DROP_WD.has(wd) || wd in ISLAND_PEEL_WD || wd in MUNI_RU_FIX_WD);
    let ru: string | null = null;
    if (!qidDirect) {
      if (wd && byQ.has(wd)) ru = byQ.get(wd)!.parentEl;
      else {
        const nm = nearestMuniRu(roughCentroid({ properties: {}, geometry: feat.geometry }), munis);
        if (nm.dist > FOREIGN_DEG) { foreign++; continue; }
        ru = nm.parentEl;
      }
    }
    const id = assignOsm(wd, ru);
    if (!id) { dropped++; continue; }
    // Deferred islands are excluded from the live game, but the preview build
    // keeps them so their outline can be judged and improved.
    if (!PREVIEW && DEFERRED_ANSWER_IDS.has(id)) { dropped++; continue; }
    if (skip.has(id)) continue; // sourced from geoBoundaries fallback instead
    out.push({ properties: { ansid: id }, geometry: feat.geometry });
  }
  console.log(`OSM: tagged ${out.length}, dropped ${dropped}, foreign ${foreign}`);
  return out;
}

/** geoBoundaries features tagged for the fallback ids only (old spatial join). */
function taggedFromGeoBoundaries(ids: ReadonlySet<string>, munis: Muni[]): Feature[] {
  if (ids.size === 0) return [];
  const geo = JSON.parse(
    fs.readFileSync(path.join(SRC, "geoBoundaries-GRC-ADM3.geojson"), "utf8"),
  );
  const out: Feature[] = [];
  for (const f of geo.features as Feature[]) {
    const nm = nearestMuniRu(roughCentroid(f), munis);
    const id = assignTarget(f.properties.shapeName, nm.parentEl);
    if (id && ids.has(id)) out.push({ properties: { ansid: id }, geometry: f.geometry });
  }
  return out;
}

function main() {
  const munis: Muni[] = JSON.parse(fs.readFileSync(path.join(SRC, "wd-munis.json"), "utf8"));
  const byQ = new Map(munis.filter((m) => m.q).map((m) => [m.q, m]));

  // ── 1. Assign each municipality to an answer id (OSM primary + fallback) ─────
  const tagged: Feature[] = [
    ...taggedFromOsm(munis, byQ, GEOBOUNDARIES_FALLBACK_IDS),
    ...taggedFromGeoBoundaries(GEOBOUNDARIES_FALLBACK_IDS, munis),
  ];
  fs.writeFileSync(
    TMP,
    JSON.stringify({
      type: "FeatureCollection",
      features: tagged.map((f) => ({ type: "Feature", properties: f.properties, geometry: f.geometry })),
    }),
  );
  console.log(`total tagged municipalities: ${tagged.length}`);

  // ── 2. Dissolve by answer id (mapshaper via npx, no saved dep) ───────────────
  execSync(
    `npx --yes mapshaper "${TMP}" -dissolve2 ansid -o format=geojson "${DISSOLVED}"`,
    { stdio: "inherit" },
  );

  // ── 2b. Size-aware simplify: bucket each dissolved shape by its own size, then
  //        run ONE mapshaper -simplify pass per bucket. Mainland stays at 200 m;
  //        islands get islandIntervalM(diagKm). TOPO_SIMPLIFY forces one spec. ──
  const rawFeatures = applyPolygonPeels(
    JSON.parse(fs.readFileSync(DISSOLVED, "utf8")).features as Feature[],
  );
  const bucketOf = (f: Feature): string => {
    if (SIMPLIFY_OVERRIDE) return SIMPLIFY_OVERRIDE;
    const meta = ANSWER_META[f.properties.ansid];
    if (!meta?.isIsland) return "interval=200"; // mainland — untouched
    // Bucket by the DRAWN landmass, so this must use the same choice the render
    // makes below — capital first, not merely largest.
    const drawn = polygonsBestFirst(polygonsOf(f), meta.capitalCoord)[0];
    const xs = drawn[0].map((p) => p[0]);
    const ys = drawn[0].map((p) => p[1]);
    const diagKm = haversineKm([Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]);
    return `interval=${islandIntervalM(diagKm)}`;
  };
  const byBucket = new Map<string, Feature[]>();
  for (const f of rawFeatures) {
    const b = bucketOf(f);
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b)!.push(f);
  }
  const simplifiedFeatures: Feature[] = [];
  for (const [spec, feats] of byBucket) {
    const inF = path.join(SRC, "_bucket_in.geojson");
    const outF = path.join(SRC, "_bucket_out.geojson");
    fs.writeFileSync(inF, JSON.stringify({
      type: "FeatureCollection",
      features: feats.map((f) => ({ type: "Feature", properties: f.properties, geometry: f.geometry })),
    }));
    console.log(`  -simplify ${spec}: ${feats.length} shapes`);
    execSync(`npx --yes mapshaper "${inF}" -simplify ${spec} keep-shapes -o format=geojson "${outF}"`, { stdio: "inherit" });
    simplifiedFeatures.push(...(JSON.parse(fs.readFileSync(outF, "utf8")).features as Feature[]));
    fs.rmSync(inF, { force: true });
    fs.rmSync(outF, { force: true });
  }

  // ── 3. Project each dissolved shape → SVG path + viewBox + centroid ──────────
  const dissolved = { features: simplifiedFeatures };
  const shapes: TopothesiesShape[] = [];
  const answers: TopothesiesAnswer[] = [];

  for (const f of dissolved.features as Feature[]) {
    const id = f.properties.ansid;
    const meta = ANSWER_META[id];
    if (!meta) { console.warn(`no ANSWER_META for dissolved id "${id}" — skipped`); continue; }

    // Island answers show their main landmass alone (drop satellite islets so the
    // self-framing shape zooms in); MAIN_ISLAND_POLYGONS overrides the few that
    // are genuinely several comparable islands. A display + centroid decision, so
    // it happens before both the path and the centroid.
    const keep = MAIN_ISLAND_POLYGONS[id] ?? (meta.isIsland ? 1 : undefined);
    const polygons =
      keep === undefined
        ? polygonsOf(f)
        : polygonsBestFirst(polygonsOf(f), meta.capitalCoord).slice(0, keep);
    const allPts = polygons.flat(2) as LngLat[];
    const refLat = allPts.reduce((s, p) => s + p[1], 0) / allPts.length;

    const projected: [number, number][] = [];
    let d = "";
    for (const polygon of polygons) {
      for (const ring of polygon) {
        d += ringToPath(ring, refLat);
        for (const p of ring) projected.push(projectPoint(p, refLat));
      }
    }
    shapes.push({ id, path: d, viewBox: computeViewBox(projected) });

    const centroid = centroidLngLat(...polygons);
    answers.push({
      id,
      name: meta.name,
      nameNormalized: normalizeLetters(meta.name),
      capital: meta.capital,
      capitalNormalized: normalizeLetters(meta.capital),
      capitalCoord: meta.capitalCoord,
      centroid: [round6(centroid[0]), round6(centroid[1])],
      aliases: meta.aliases.map(normalizeLetters),
      region: meta.region,
      isIsland: meta.isIsland,
    });
  }

  answers.sort((a, b) => a.id.localeCompare(b.id));
  shapes.sort((a, b) => a.id.localeCompare(b.id));

  // ── 4a. Preview build: write one self-contained cards file, then stop ─────────
  if (PREVIEW) {
    const pathById = new Map(shapes.map((s) => [s.id, s]));
    const cards = answers.map((a) => {
      const s = pathById.get(a.id)!;
      return {
        id: a.id,
        name: a.name,
        capital: a.capital,
        isIsland: a.isIsland,
        status: DEFERRED_ANSWER_IDS.has(a.id) ? "deferred" : "live",
        path: s.path,
        viewBox: s.viewBox,
      };
    });
    // Can't-peel promotions (share a δήμος with a bigger island) have no geometry:
    // emit them as placeholder cards so the list is complete and the polygon-split
    // work is visible.
    for (const p of CANT_PEEL_PLACEHOLDERS) {
      cards.push({
        id: p.id, name: p.name, capital: p.capital, isIsland: true,
        status: "placeholder", path: "", viewBox: "",
      });
    }
    cards.sort((a, b) => a.name.localeCompare(b.name, "el"));
    const previewOut = path.join(SRC, "preview-cards.json");
    fs.writeFileSync(previewOut, JSON.stringify(cards, null, 0) + "\n");
    const live = cards.filter((c) => c.status === "live").length;
    const deferred = cards.filter((c) => c.status === "deferred").length;
    console.log(
      `preview: wrote ${cards.length} cards (${live} live, ${deferred} deferred, ` +
        `${CANT_PEEL_PLACEHOLDERS.length} placeholder) → ${previewOut}`,
    );
    fs.rmSync(TMP, { force: true });
    fs.rmSync(DISSOLVED, { force: true });
    return;
  }

  // ── 4. Emit + gate ──────────────────────────────────────────────────────────
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "answers.json"), JSON.stringify(answers, null, 0) + "\n");
  fs.writeFileSync(path.join(OUT, "shapes.json"), JSON.stringify(shapes, null, 0) + "\n");

  const errors = validateEmitted({ answers, shapes }, { requiredIds: [...CONFIRMED_SPLIT_IDS] });
  const maxKm = maxPairwiseCentroidKm(answers.map((a) => a.centroid));
  const maxPath = Math.max(...shapes.map((s) => s.path.length));
  const biggest = shapes.find((s) => s.path.length === maxPath);

  console.log(`\nemitted ${answers.length} answers / ${shapes.length} shapes`);
  console.log(`shapes.json = ${(fs.statSync(path.join(OUT, "shapes.json")).size / 1024).toFixed(1)} KB`);
  console.log(`max path length = ${maxPath} chars (${biggest?.id})`);
  console.log(`PROXIMITY_MAX_KM should be set to ${Math.round(maxKm)}`);
  if (errors.length) {
    console.error(`\n❌ validateEmitted found ${errors.length} problem(s):`);
    errors.forEach((e) => console.error("  " + e));
    process.exitCode = 1;
  } else {
    console.log("✅ validateEmitted: clean");
  }

  fs.rmSync(TMP, { force: true });
  fs.rmSync(DISSOLVED, { force: true });
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

main();
