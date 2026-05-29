#!/usr/bin/env node
// apply-nominations.mjs — applies accepted Leksikastirio nominations to all word-list files.
//
// Usage:
//   node scripts/apply-nominations.mjs
//   node scripts/apply-nominations.mjs --dry-run
//
// Required env vars (in .env.local or exported in shell):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Routing by word length:
//   len ≤ 3  →  words-el.json only
//   len 4–8  →  words-el.json  AND  src/data/leksiarxeio/words-{N}.json
//   remove   →  cascades to all files the word appears in

import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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

if (!isDryRun) {
  if (added.length > 0 || removed.length > 0) {
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

  const ids = nominations.map((n) => n.id);
  await supabase
    .from("nominations")
    .update({ reviewed_at: new Date().toISOString() })
    .in("id", ids);

  console.log(`Marked ${ids.length} row(s) reviewed_at = now()`);
}

console.log(`\nSummary: +${added.length} added, -${removed.length} removed, ${skipped.length} skipped.`);
if (!isDryRun && (added.length > 0 || removed.length > 0)) {
  console.log("\nNext step: npm run build && deploy.");
}
