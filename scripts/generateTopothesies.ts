// generateTopothesies.ts — the one-time, local data generator for Topothesies.
//
// Like `generate-leksoplegma`, this is run by hand and its OUTPUT is committed
// (src/data/topothesies/{answers,shapes}.json); the raw geoBoundaries shapefile
// and Wikidata dumps it reads stay gitignored in scripts/lib/topothesies/source/
// (ADR 0018 — builds stay hermetic, no route depends on geodata being reachable).
//
// Pipeline: assign each ADM3 municipality to an answer id (curation.ts) →
// mapshaper dissolve2 + simplify → project to precomputed SVG paths + area-
// weighted centroids (project.ts) → emit the two files → validateEmitted gate,
// and print the max pairwise centroid km for gameRules.TOPOTHESIES.PROXIMITY_MAX_KM.
//
//   npx tsx scripts/generateTopothesies.ts

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { normalizeLetters } from "../src/lib/normalize";
import type { LngLat, TopothesiesAnswer, TopothesiesShape } from "../src/games/topothesies/types";
import { ANSWER_META, assignTarget } from "./lib/topothesies/curation";
import {
  centroidLngLat,
  computeViewBox,
  maxPairwiseCentroidKm,
  projectPoint,
  ringArea,
  ringToPath,
} from "./lib/topothesies/project";
import { validateEmitted } from "./lib/topothesies/validateEmitted";
import { CONFIRMED_SPLIT_IDS, MAIN_ISLAND_POLYGONS } from "./lib/topothesies/confirmedSplits";

const SRC = path.join(__dirname, "lib/topothesies/source");
const OUT = path.join(__dirname, "../src/data/topothesies");
const TMP = path.join(__dirname, "lib/topothesies/source/_tagged.geojson");
const DISSOLVED = path.join(__dirname, "lib/topothesies/source/_dissolved.geojson");
// Visvalingam retention (mapshaper default is Visvalingam weighted). Default is
// 100% = keep every source vertex: tiny Aegean islands must retain all the
// detail geoBoundaries has to stay recognizable (at 25% agistri was a 6-pt blob;
// at 70% still only 17; at 100% it reaches its 37-vertex source ceiling). The
// client only ever ships one shape/day (ADR 0018), so even the densest mainland
// path costs no per-visit bytes; the only real ceiling is the per-shape byte
// budget in performance.test.ts. Islands that stay coarse at 100% (e.g.
// Καστελλόριζο, 11 source vertices) are capped by geoBoundaries itself and can
// only improve via a higher-res source (handoff #3). Override with TOPO_SIMPLIFY.
const SIMPLIFY = process.env.TOPO_SIMPLIFY ?? "100%";

interface Muni {
  el: string | null;
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

function main() {
  const geo = JSON.parse(fs.readFileSync(path.join(SRC, "geoBoundaries-GRC-ADM3.geojson"), "utf8"));
  const munis: Muni[] = JSON.parse(fs.readFileSync(path.join(SRC, "wd-munis.json"), "utf8")).filter(
    (m: Muni) => m.coord,
  );

  // ── 1. Assign each municipality to an answer id (spatial muni→RU + curation) ─
  const tagged: Feature[] = [];
  let dropped = 0;
  for (const f of geo.features as Feature[]) {
    const c = roughCentroid(f);
    let best: Muni | null = null;
    let bd = Infinity;
    for (const m of munis) {
      const dx = c[0] - m.coord![0];
      const dy = c[1] - m.coord![1];
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = m; }
    }
    const id = assignTarget(f.properties.shapeName, best?.parentEl ?? null);
    if (!id) { dropped++; continue; }
    f.properties.ansid = id;
    tagged.push(f);
  }
  fs.writeFileSync(TMP, JSON.stringify({ type: "FeatureCollection", features: tagged }));
  console.log(`assigned ${tagged.length} municipalities, dropped ${dropped}`);

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

    // Keep only the N largest polygons for islands that should drop their
    // satellite islets (confirmedSplits.MAIN_ISLAND_POLYGONS) — a display +
    // centroid decision, so it happens before both the path and the centroid.
    const keep = MAIN_ISLAND_POLYGONS[id];
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

  console.log(`\nemitted ${answers.length} answers / ${shapes.length} shapes`);
  console.log(`shapes.json = ${(fs.statSync(path.join(OUT, "shapes.json")).size / 1024).toFixed(1)} KB`);
  console.log(`max path length = ${Math.max(...shapes.map((s) => s.path.length))} chars`);
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
