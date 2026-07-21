// fetchWikidata.ts — regenerates the gitignored source/wd-munis.json that
// generateTopothesies.ts spatially matches ADR3 polygons against.
//
// Provenance for the muni→regional-unit map (handoff-03 §0): geoBoundaries
// carries no RU attribute, so we resolve it by matching each municipality
// polygon's centroid to the nearest Wikidata municipality point (P31 = Q1349648,
// "municipality of Greece") and reading that municipality's P131 parent
// (the regional unit). Regional-unit capitals/coords (baked into curation.ts)
// come from the RU query (P31 = Q1234255, P36 capital, P625 coord, P131 region).
//
// Run only when refreshing the source data (network required — Wikidata SPARQL):
//   npx tsx scripts/lib/topothesies/fetchWikidata.ts

import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "greekbee-topothesies/1.0 (melkorinos@gmail.com)";
const OUT = path.join(__dirname, "source");

function sparql(query: string): Promise<{ results: { bindings: Record<string, { value: string }>[] } }> {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } }, (r) => {
        let d = "";
        r.on("data", (c) => (d += c));
        r.on("end", () => {
          try { resolve(JSON.parse(d)); } catch { reject(new Error("bad SPARQL response")); }
        });
      })
      .on("error", reject);
  });
}

const coord = (s?: string): [number, number] | null => {
  const m = s?.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
};

async function main() {
  const q = `SELECT ?m ?mEl ?coord ?parentEl WHERE {
    ?m wdt:P31 wd:Q1349648.
    OPTIONAL { ?m wdt:P625 ?coord. }
    OPTIONAL { ?m rdfs:label ?mEl. FILTER(LANG(?mEl)="el") }
    OPTIONAL { ?m wdt:P131 ?parent. OPTIONAL { ?parent rdfs:label ?parentEl. FILTER(LANG(?parentEl)="el") } }
  }`;
  const r = await sparql(q);
  const byQ: Record<string, { el: string | null; coord: [number, number] | null; parentEl: string | null }> = {};
  for (const b of r.results.bindings) {
    const id = b.m.value.split("/").pop()!;
    const row = { el: b.mEl?.value ?? null, coord: coord(b.coord?.value), parentEl: b.parentEl?.value ?? null };
    const prev = byQ[id];
    if (!prev) { byQ[id] = row; continue; }
    prev.el ??= row.el;
    prev.coord ??= row.coord;
    prev.parentEl ??= row.parentEl;
  }
  const munis = Object.values(byQ);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "wd-munis.json"), JSON.stringify(munis));
  console.log(`wrote ${munis.length} municipalities (${munis.filter((m) => m.coord).length} with coords)`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
