#!/usr/bin/env node
// apply-nominations.mjs — applies admin-reviewed Leksikastirio nominations to the dataset.
//
// Run it from the repo (typically via `npm run apply-nominations`, which loads
// your gitignored .env). It reads the DB and writes local JSON only — it never
// builds, commits, or deploys. Review the git diff, then build & deploy yourself.
//
// Usage:
//   npm run apply-nominations          (node --env-file-if-exists=.env … )
//   npm run apply-nominations:dry      (--dry-run: preview, no writes)
//
// Required env vars (in .env / .env.local, or exported in shell):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// What a Nomination's (direction × status) means — only `accepted` rows act on
// the dataset; `rejected` rows are housekeeping, reported but never deleted:
//   accepted + add     →  add word to dictionary + leksiarxeio lists + re-sync puzzles
//   accepted + remove  →  delete word from dictionary + leksiarxeio lists + re-sync puzzles
//   rejected (either)  →  no dataset change (already hidden from the UI; row retained)
//
// Routing by word length (word-list files):
//   len ≤ 3  →  words-el.json only
//   len 4–8  →  words-el.json  AND  src/data/leksiarxeio/words-{N}.json
//   remove   →  cascades to all files the word appears in
//
// Puzzle re-sync (puzzles-el.json): every Pre-built Leksokipos Puzzle embeds its
// own pre-computed `validWords`. After editing the dictionary we patch those
// arrays surgically (see scripts/lib/resync-puzzles.mjs) so removed words stop
// scoring and added words start scoring. Coupled into this one script on purpose
// — a separate, skippable re-sync step is exactly how it got missed before.

import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { resyncPuzzles } from "./lib/resync-puzzles.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDryRun  = process.argv.includes("--dry-run");

// ── Env ───────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ── Normalise (mirrors src/games/leksokipos/lib/normalize.ts) ─────────────────

function normalise(word) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ς/g, "σ");
}

// ── Word list helpers ─────────────────────────────────────────────────────────

const wordsElPath = join(__dirname, "../src/data/words-el.json");

function readWordsEl() {
  return JSON.parse(readFileSync(wordsElPath, "utf8"));
}

function writeWordsEl(words) {
  writeFileSync(wordsElPath, JSON.stringify(words.sort()), "utf8");
}

const LEKSIARXEIO_LENGTHS = [4, 5, 6, 7, 8];

function leksiarxeioPath(n) {
  return join(__dirname, `../src/data/leksiarxeio/words-${n}.json`);
}

function readLeksiarxeioWords(n) {
  return JSON.parse(readFileSync(leksiarxeioPath(n), "utf8"));
}

function writeLeksiarxeioWords(n, words) {
  writeFileSync(leksiarxeioPath(n), JSON.stringify(words.sort()), "utf8");
}

// puzzles-el.json is pretty-printed (2-space) by batch-generate.ts — match it.
const puzzlesElPath = join(__dirname, "../src/data/leksokipos/puzzles-el.json");

function readPuzzlesEl() {
  return JSON.parse(readFileSync(puzzlesElPath, "utf8"));
}

function writePuzzlesEl(puzzles) {
  writeFileSync(puzzlesElPath, JSON.stringify(puzzles, null, 2), "utf8");
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { data: nominations, error } = await supabase
  .from("nominations")
  .select("id, word, direction")
  .eq("status", "accepted")
  .is("reviewed_at", null);

if (error) {
  console.error("Supabase error:", error.message);
  process.exit(1);
}

if (!nominations || nominations.length === 0) {
  console.log("No accepted nominations to apply.");
  process.exit(0);
}

console.log(`Found ${nominations.length} accepted nomination(s)${isDryRun ? " [DRY RUN]" : ""}:\n`);

// Load all files once upfront
let wordsEl = readWordsEl();
const leksiarxeio = {};
for (const n of LEKSIARXEIO_LENGTHS) {
  leksiarxeio[n] = readLeksiarxeioWords(n);
}

const added   = [];
const removed = [];
const skipped = [];

for (const nom of nominations) {
  const word = normalise(nom.word);
  const len  = word.length;

  if (nom.direction === "add") {
    if (wordsEl.includes(word)) {
      console.log(`  SKIP  (already exists) → ${word}`);
      skipped.push(word);
    } else {
      console.log(`  ADD   (len ${len}) → ${word}`);
      added.push(word);
      if (!isDryRun) {
        wordsEl.push(word);
        if (LEKSIARXEIO_LENGTHS.includes(len)) {
          leksiarxeio[len].push(word);
        }
      }
    }
  } else if (nom.direction === "remove") {
    if (!wordsEl.includes(word)) {
      console.log(`  SKIP  (not in list)    → ${word}`);
      skipped.push(word);
    } else {
      console.log(`  REMOVE (len ${len}) → ${word}`);
      removed.push(word);
      if (!isDryRun) {
        wordsEl = wordsEl.filter((w) => w !== word);
        if (LEKSIARXEIO_LENGTHS.includes(len)) {
          leksiarxeio[len] = leksiarxeio[len].filter((w) => w !== word);
        }
      }
    }
  }
}

const wordListChanged = added.length > 0 || removed.length > 0;

// ── Word-list files ─────────────────────────────────────────────────────────
if (!isDryRun && wordListChanged) {
  writeWordsEl(wordsEl);
  console.log(`\nUpdated src/data/words-el.json`);

  // Write only leksiarxeio files that were actually touched
  const touchedLengths = [...new Set(
    [...added, ...removed]
      .map((w) => w.length)
      .filter((n) => LEKSIARXEIO_LENGTHS.includes(n))
  )];
  for (const n of touchedLengths) {
    writeLeksiarxeioWords(n, leksiarxeio[n]);
    console.log(`Updated src/data/leksiarxeio/words-${n}.json`);
  }
}

// ── Pre-built Leksokipos puzzles (validWords re-sync) ───────────────────────
// Patch the embedded validWords so removed words stop scoring and added words
// start scoring. Runs in dry-run too, as a preview (no write).
if (wordListChanged) {
  const puzzles = readPuzzlesEl();
  const { puzzles: resynced, changed } = resyncPuzzles(puzzles, { added, removed });

  if (changed.length === 0) {
    console.log(`\nNo pre-built puzzles affected — puzzles-el.json unchanged.`);
  } else {
    console.log(`\nRe-sync${isDryRun ? " [DRY RUN]" : ""}: ${changed.length} puzzle(s) affected`);
    for (const c of changed) {
      const parts = [];
      if (c.added.length)   parts.push(`+${c.added.join(", +")}`);
      if (c.removed.length) parts.push(`-${c.removed.join(", -")}`);
      console.log(`  ${c.id ?? "(no id)"}: ${parts.join("  ")}`);
    }
    if (!isDryRun) {
      writePuzzlesEl(resynced);
      console.log(`Updated src/data/leksokipos/puzzles-el.json`);
    }
  }
}

// ── Mark accepted rows reviewed; report rejected (housekeeping only) ────────
if (!isDryRun) {
  const ids = nominations.map((n) => n.id);
  await supabase
    .from("nominations")
    .update({ reviewed_at: new Date().toISOString() })
    .in("id", ids);

  console.log(`Marked ${ids.length} row(s) reviewed_at = now()`);
}

// Rejected nominations are retained as history and already hidden from the UI
// (status = 'rejected'). Report the count so the operator knows the backlog size.
const { count: rejectedCount } = await supabase
  .from("nominations")
  .select("id", { count: "exact", head: true })
  .eq("status", "rejected");

if (typeof rejectedCount === "number") {
  console.log(`Rejected nominations in backlog: ${rejectedCount} (hidden, retained)`);
}

console.log(`\nSummary: +${added.length} added, -${removed.length} removed, ${skipped.length} skipped.`);
if (!isDryRun && wordListChanged) {
  console.log("\nNext step: review the git diff, then npm run build && deploy.");
}
