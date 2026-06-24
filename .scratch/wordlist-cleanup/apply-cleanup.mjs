#!/usr/bin/env node
// apply-cleanup.mjs — local, one-pass application of the proper-noun cleanup.
//
// Applies our 16,933 local REMOVALS (from decisions.json) plus any admin
// ADDITIONS (from a local additions.json, fetched once from Supabase) to:
//   - src/data/words-el.json
//   - src/data/leksiarxeio/words-{4..8}.json   (length-routed)
//   - src/data/leksokipos/puzzles-el.json       (validWords re-sync)
//
// Reuses the project's tested resyncPuzzles helper so puzzle logic is identical
// to the official apply-nominations path. Set-based + single-pass, so 16,933
// removals run in seconds with no OOM (unlike the per-word loop in
// apply-nominations.mjs, which is O(n×m)).
//
// Touches NO network. Supabase is only involved in two tiny side steps you run
// separately: fetch-additions (read) and mark-additions-reviewed (write).
//
// Usage:
//   node apply-cleanup.mjs              # DRY RUN — preview only, writes nothing
//   node apply-cleanup.mjs --in-place   # actually write the data files

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { resyncPuzzles, normalise } from "../../scripts/lib/resync-puzzles.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "../..");
const isDry = !process.argv.includes("--in-place");

const LENGTHS = [4, 5, 6, 7, 8];
const p = {
  words: join(REPO, "src/data/words-el.json"),
  lek: (n) => join(REPO, `src/data/leksiarxeio/words-${n}.json`),
  puzzles: join(REPO, "src/data/leksokipos/puzzles-el.json"),
};
const read = (f) => JSON.parse(readFileSync(f, "utf8"));

// ── Inputs ──────────────────────────────────────────────────────────────────
const decisions = read(join(__dirname, "decisions.json")).decisions;
const removed = Object.entries(decisions)
  .filter(([, v]) => v === "remove")
  .map(([w]) => normalise(w));

let added = [];
const addPath = join(__dirname, "additions.json");
if (existsSync(addPath)) {
  added = read(addPath).additions.map((a) => normalise(a.word));
  console.log(`additions.json: ${added.length} word(s) to add`);
} else {
  console.log("additions.json: not present — applying removals only for now");
}

const removeSet = new Set(removed);
const addSet = new Set(added);
// A word both removed and added → removal wins (consistent with resyncPuzzles).
for (const w of removeSet) addSet.delete(w);

// ── words-el.json ─────────────────────────────────────────────────────────────
const words = read(p.words);
const wordSet = new Set(words);
const removedHit = removed.filter((w) => wordSet.has(w));
const addedNew = [...addSet].filter((w) => !wordSet.has(w));
const nextWords = words.filter((w) => !removeSet.has(w)).concat(addedNew).sort();

console.log(`\nwords-el.json : ${words.length} → ${nextWords.length}  (−${removedHit.length} +${addedNew.length})`);

// ── leksiarxeio words-{N}.json ───────────────────────────────────────────────
const lekReport = [];
const lekNext = {};
const lekChanged = new Set();
for (const n of LENGTHS) {
  const cur = read(p.lek(n));
  const next = cur.filter((w) => !removeSet.has(w))
    .concat(addedNew.filter((w) => w.length === n))
    .sort();
  lekNext[n] = next;
  if (next.length !== cur.length) {
    lekChanged.add(n);
    lekReport.push(`  words-${n}: ${cur.length} → ${next.length}`);
  }
}
console.log(`leksiarxeio   :\n${lekReport.join("\n") || "  (no length-4..8 changes)"}`);

// ── puzzles-el.json re-sync (reuse tested helper) ────────────────────────────
const puzzles = read(p.puzzles);
const { puzzles: nextPuzzles, changed } = resyncPuzzles(puzzles, { added: addedNew, removed: removedHit });
const totRemoved = changed.reduce((s, c) => s + c.removed.length, 0);
const totAdded = changed.reduce((s, c) => s + c.added.length, 0);
console.log(`puzzles-el    : ${changed.length}/${puzzles.length} puzzles affected  (−${totRemoved} +${totAdded} validWords)`);

// ── Write (or not) ────────────────────────────────────────────────────────────
if (isDry) {
  console.log("\n[DRY RUN] nothing written. Re-run with --in-place to apply.");
} else {
  writeFileSync(p.words, JSON.stringify(nextWords), "utf8");
  for (const n of lekChanged) writeFileSync(p.lek(n), JSON.stringify(lekNext[n]), "utf8");
  if (changed.length) writeFileSync(p.puzzles, JSON.stringify(nextPuzzles, null, 2), "utf8");
  console.log("\n✓ written. Next: run tests/lint/build, verify, THEN mark additions reviewed in Supabase.");
}
