// fetchOsmBoundaries.ts — regenerates the gitignored source/osm-adm7.geojson that
// generateTopothesies.ts assembles into the answer silhouettes.
//
// Provenance (handoff-outline-fidelity #2): the answer geometry is OpenStreetMap
// administrative boundaries at admin_level=7 (Kallikratis δήμοι), published under
// the ODbL. Each δήμος is joined to an answer id by its Wikidata QID
// (curation.assignOsm), so the raw Overpass `out geom` response is all we need —
// no per-relation post-processing here.
//
// The country-area form times out on the main instance, so we query by Greece's
// bbox (foreign border municipalities are dropped later by curation's nearest-RU
// distance filter) and fall back across mirrors. Run only when refreshing the
// source data (network required):
//   npx tsx scripts/lib/topothesies/fetchOsmBoundaries.ts

import fs from "node:fs";
import path from "node:path";

const UA = "greekbee-topothesies/1.0 (melkorinos@gmail.com)";
const OUT = path.join(__dirname, "source", "osm-adm7.geojson");
// Greece bounding box [south, west, north, east].
const BBOX = "34.7,19.2,41.9,29.8";
const QUERY = `[out:json][timeout:280][bbox:${BBOX}];rel["boundary"="administrative"]["admin_level"="7"];out geom;`;
const MIRRORS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

async function main() {
  for (const endpoint of MIRRORS) {
    try {
      console.log(`fetching admin_level=7 from ${endpoint} …`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(QUERY)}`,
      });
      if (!res.ok) { console.warn(`  ${res.status} ${res.statusText} — next mirror`); continue; }
      const text = await res.text();
      const json = JSON.parse(text);
      const rels = json.elements.filter((e: { type: string }) => e.type === "relation").length;
      if (rels < 300) { console.warn(`  only ${rels} relations — next mirror`); continue; }
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, text);
      console.log(`wrote ${OUT} (${(text.length / 1024 / 1024).toFixed(1)} MB, ${rels} relations)`);
      return;
    } catch (e) {
      console.warn(`  failed: ${(e as Error).message} — next mirror`);
    }
  }
  throw new Error("all Overpass mirrors failed");
}

main();
