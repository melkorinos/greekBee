#!/usr/bin/env node
// apply-proposed-words.mjs — adds a human-reviewed list of derived/proposed words
// to the dataset (words-el.json + leksiarxeio/words-{N}.json + puzzle re-sync).
//
// This is the *inject* half of the /apply-nominations proposer flow: the agent
// generates morphological relatives of freshly-accepted words, the developer
// prunes the list, and the survivors are applied here. Unlike apply-nominations
// it NEVER touches the DB — the words come from a local reviewed list, not the
// nominations table. Add-only (no removes). Words already present are skipped.
//
// Usage:
//   node scripts/apply-proposed-words.mjs word1 word2 ...
//   node scripts/apply-proposed-words.mjs --dry-run word1 word2 ...
//   node scripts/apply-proposed-words.mjs --file path/to/list.txt   (# comments + whitespace-separated)
//
// Routing by length mirrors apply-nominations:
//   len ≤ 3  → words-el.json only
//   len 4–8  → words-el.json AND src/data/leksiarxeio/words-{N}.json
//   len > 8  → words-el.json only (no leksiarxeio bucket) — still re-synced into puzzles

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { resyncPuzzles } from "./lib/resync-puzzles.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

// ── Collect input words (positional args and/or --file) ───────────────────────
const words = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--dry-run") continue;
  if (a === "--file") {
    const raw = readFileSync(args[++i], "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const clean = line.replace(/#.*$/, "").trim();      // drop # comments
      if (clean) words.push(...clean.split(/\s+/));
    }
    continue;
  }
  words.push(a);
}

if (words.length === 0) {
  console.error("No words given. Pass words as args or via --file <path>.");
  process.exit(1);
}

// ── Normalise (mirrors src/lib/normalize.ts) ──────────────────────────────────
function normalise(word) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ς/g, "σ");
}

// ── File helpers (match apply-nominations serialisation exactly) ──────────────
const wordsElPath = join(__dirname, "../src/data/words-el.json");
const LEKSIARXEIO_LENGTHS = [4, 5, 6, 7, 8];
const leksiarxeioPath = (n) => join(__dirname, `../src/data/leksiarxeio/words-${n}.json`);
const puzzlesElPath = join(__dirname, "../src/data/leksokipos/puzzles-el.json");

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// ── Apply ─────────────────────────────────────────────────────────────────────
let wordsEl = readJson(wordsElPath);
const wordsElSet = new Set(wordsEl);
const leksiarxeio = {};
for (const n of LEKSIARXEIO_LENGTHS) leksiarxeio[n] = readJson(leksiarxeioPath(n));

const added = [];
const skipped = [];

for (const raw of words) {
  const word = normalise(raw);
  const len = [...word].length;
  if (wordsElSet.has(word)) {
    console.log(`  SKIP  (already exists) → ${word}`);
    skipped.push(word);
    continue;
  }
  console.log(`  ADD   (len ${len}) → ${word}`);
  added.push(word);
  wordsElSet.add(word);
  if (!isDryRun) {
    wordsEl.push(word);
    if (LEKSIARXEIO_LENGTHS.includes(len)) leksiarxeio[len].push(word);
  }
}

if (added.length === 0) {
  console.log(`\nNothing to add (${skipped.length} already present). No files written.`);
  process.exit(0);
}

// ── Word-list files ───────────────────────────────────────────────────────────
if (!isDryRun) {
  writeFileSync(wordsElPath, JSON.stringify(wordsEl.sort()), "utf8");
  console.log(`\nUpdated src/data/words-el.json`);

  const touchedLengths = [...new Set(
    added.map((w) => [...w].length).filter((n) => LEKSIARXEIO_LENGTHS.includes(n)),
  )];
  for (const n of touchedLengths) {
    writeFileSync(leksiarxeioPath(n), JSON.stringify(leksiarxeio[n].sort()), "utf8");
    console.log(`Updated src/data/leksiarxeio/words-${n}.json`);
  }
}

// ── Pre-built Leksokipos puzzles (validWords re-sync) ─────────────────────────
{
  const puzzles = readJson(puzzlesElPath);
  const { puzzles: resynced, changed } = resyncPuzzles(puzzles, { added });

  if (changed.length === 0) {
    console.log(`\nNo pre-built puzzles affected — puzzles-el.json unchanged.`);
  } else {
    console.log(`\nRe-sync${isDryRun ? " [DRY RUN]" : ""}: ${changed.length} puzzle(s) affected`);
    for (const c of changed) {
      if (c.added.length) console.log(`  ${c.id ?? "(no id)"}: +${c.added.join(", +")}`);
    }
    if (!isDryRun) {
      writeFileSync(puzzlesElPath, JSON.stringify(resynced, null, 2), "utf8");
      console.log(`Updated src/data/leksokipos/puzzles-el.json`);
    }
  }
}

console.log(`\nSummary: +${added.length} added, ${skipped.length} skipped${isDryRun ? " [DRY RUN]" : ""}.`);
if (!isDryRun) console.log("\nNext step: review the git diff, then npm run build && deploy.");
