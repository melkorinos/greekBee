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
  projectPoint,
  ringArea,
  ringToPath,
} from "./lib/topothesies/project";
import { validateEmitted } from "./lib/topothesies/validateEmitted";
import {
  CONFIRMED_SPLIT_IDS,
  DEFERRED_ANSWER_IDS,
  MAIN_ISLAND_POLYGONS,
} from "./lib/topothesies/confirmedSplits";

const SRC = path.join(__dirname, "lib/topothesies/source");
const OUT = path.join(__dirname, "../src/data/topothesies");
const TMP = path.join(__dirname, "lib/topothesies/source/_tagged.geojson");
const DISSOLVED = path.join(__dirname, "lib/topothesies/source/_dissolved.geojson");

// Answer ids to source from the old geoBoundaries feed instead of OSM (per-id
// fallback for any silhouette the operator judges worse under OSM). Empty = pure
// OSM (single ODbL credit). Any id added here must have its geoBoundaries
// attribution line restored in src/games/topothesies/attribution.ts.
const GEOBOUNDARIES_FALLBACK_IDS: ReadonlySet<string> = new Set([]);

// Simplification. OSM coastlines are dense (a δήμος can carry thousands of
// vertices), so unlike the sparse geoBoundaries feed we simplify DOWN. An
// absolute ground-distance tolerance (interval, metres) — not a percentage —
// gives every coast the same resolution: it trims the dense mainland hard while
// preserving small-island form, so the largest single silhouette (Εύβοια, ~15.6
// KB at 200 m) stays under the per-shape byte budget in performance.test.ts
// while Καστελλόριζο keeps ~33 vertices (was 11 at the geoBoundaries ceiling).
// `keep-shapes` stops small islands from collapsing. Only one shape ships per
// day (ADR 0018), so the budget is a per-shape worst case, never a whole-file
// cost. Override with TOPO_SIMPLIFY (e.g. "interval=300", or a "12%").
const SIMPLIFY = process.env.TOPO_SIMPLIFY ?? "interval=200";

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
    if (DEFERRED_ANSWER_IDS.has(id)) { dropped++; continue; } // low-fidelity, excluded for now
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

  // ── 2. Dissolve by answer id + simplify (mapshaper via npx, no saved dep) ────
  execSync(
    `npx --yes mapshaper "${TMP}" -dissolve2 ansid -simplify ${SIMPLIFY} keep-shapes ` +
      `-o format=geojson "${DISSOLVED}"`,
    { stdio: "inherit" },
  );

  // ── 3. Project each dissolved shape → SVG path + viewBox + centroid ──────────
  const dissolved = JSON.parse(fs.readFileSync(DISSOLVED, "utf8"));
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
        : polygonsOf(f)
            .slice()
            .sort((a, b) => Math.abs(ringArea(b[0])) - Math.abs(ringArea(a[0])))
            .slice(0, keep);
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
