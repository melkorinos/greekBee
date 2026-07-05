// generate-puzzle-index.mjs
//
// Derives src/data/leksokipos/puzzles-index-el.json from puzzles-el.json.
//
// The index holds only { id, date, centerLetter, outerLetters } per puzzle
// (~70 KB for 1 008 puzzles) — no validWords arrays (the 4 MB bulk).
//
// Why: the /leksokipos redirect page only needs letters + dates to build the
// canonical URL. Importing the full puzzles-el.json (4 MB) — which transitively
// sat next to words-el.json (19 MB) in the same data loader — made every cold
// start of that route pay hundreds of ms of JSON-parse Fluid CPU just to issue
// a redirect. The slim index cuts that to ~1 ms.
//
// Run after any script that adds/removes puzzles or changes their letters
// (generate-puzzle, batch-generate):
//
//   npm run generate-puzzle-index
//
// Drift guard: src/test/leksokipos/puzzleIndex.test.ts re-derives the index
// from puzzles-el.json and fails if the committed file is stale.

import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(ROOT, "src/data/leksokipos/puzzles-el.json");
const TARGET = resolve(ROOT, "src/data/leksokipos/puzzles-index-el.json");

const puzzles = JSON.parse(readFileSync(SOURCE, "utf8"));

const index = puzzles.map(({ id, date, centerLetter, outerLetters }) => ({
  id,
  date,
  centerLetter,
  outerLetters,
}));

writeFileSync(TARGET, JSON.stringify(index) + "\n", "utf8");

console.log(`Wrote ${index.length} puzzle stubs to ${TARGET}`);
