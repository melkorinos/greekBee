#!/usr/bin/env node
// apply-nominations.mjs — applies accepted Leksikastirio nominations to the word list files.
//
// Usage:
//   node scripts/apply-nominations.mjs
//   node scripts/apply-nominations.mjs --dry-run
//
// Required env vars (in .env.local or exported in shell):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// What it does:
//   1. Fetches all nominations rows where status='accepted' and reviewed_at IS NULL
//   2. For each row:
//      - direction='add'    → appends the normalised word to src/data/words-el.json
//      - direction='remove' → removes the word from src/data/words-el.json
//   3. Marks each processed row with reviewed_at = now()
//   4. Prints a summary — then run `npm run build` and deploy.

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

const wordsPath = join(__dirname, "../src/data/words-el.json");

function readWords() {
  return JSON.parse(readFileSync(wordsPath, "utf8"));
}

function writeWords(words) {
  writeFileSync(wordsPath, JSON.stringify(words, null, 2) + "\n", "utf8");
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

let words = readWords();
const added   = [];
const removed = [];
const skipped = [];

for (const nom of nominations) {
  const word = normalise(nom.word);

  if (nom.direction === "add") {
    if (words.includes(word)) {
      console.log(`  SKIP  (already exists) → ${word}`);
      skipped.push(word);
    } else {
      console.log(`  ADD   → ${word}`);
      added.push(word);
      if (!isDryRun) words.push(word);
    }
  } else if (nom.direction === "remove") {
    if (!words.includes(word)) {
      console.log(`  SKIP  (not in list)    → ${word}`);
      skipped.push(word);
    } else {
      console.log(`  REMOVE → ${word}`);
      removed.push(word);
      if (!isDryRun) words = words.filter((w) => w !== word);
    }
  }
}

if (!isDryRun) {
  if (added.length > 0 || removed.length > 0) {
    words.sort();
    writeWords(words);
    console.log(`\nUpdated src/data/words-el.json`);
  }

  // Mark all nominations as reviewed regardless of skip/add/remove.
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
