// normalize-el-dict.mjs
// Migration script (already run once on 2026-05-12).
// Converted the original accented words-el.json into a pre-normalised form and
// renamed the original to words-el.raw.json.
//
// Current dictionary state:
//   src/data/words-el.raw.json  ← CANONICAL SOURCE (original accented, 826,268 words)
//   src/data/words-el.json      ← derived: lowercase, no accents, deduplicated (811,614 words)
//
// You only need to re-run this if words-el.raw.json is replaced with a new
// dictionary export. In that case: delete words-el.raw.json first, then run:
//   node scripts/normalize-el-dict.mjs
//
// For generating per-length Wordle word lists from the raw source, use:
//   node scripts/normalize-wordlist.mjs --length=5

import { dirname, join } from "path";
import { existsSync, readFileSync, renameSync, writeFileSync } from "fs";

import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const srcPath    = join(root, "src/data/words-el.json");
const backupPath = join(root, "src/data/words-el.raw.json");
const outPath    = srcPath; // write back to same file

// ── Guard ─────────────────────────────────────────────────────────────────────
if (!existsSync(srcPath)) {
  console.error(`Not found: ${srcPath}`);
  process.exit(1);
}

if (existsSync(backupPath)) {
  console.log("Backup already exists — skipping rename step.");
  console.log("Delete words-el.raw.json manually if you want to re-run.");
  process.exit(0);
}

// ── Normalize ─────────────────────────────────────────────────────────────────
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")                  // decompose accented chars
    .replace(/[\u0300-\u036f]/g, "")  // strip combining diacritics
    .replace(/ς/g, "σ");             // final sigma → regular sigma
}

// ── Read ──────────────────────────────────────────────────────────────────────
console.log("Reading source…");
const raw = JSON.parse(readFileSync(srcPath, "utf8"));
console.log(`  Source: ${raw.length.toLocaleString()} words`);

// ── Transform ─────────────────────────────────────────────────────────────────
const normalised = [...new Set(raw.map(normalize))];
console.log(`  After normalise + deduplicate: ${normalised.length.toLocaleString()} words`);

// ── Backup original ───────────────────────────────────────────────────────────
renameSync(srcPath, backupPath);
console.log(`  Backed up original → words-el.raw.json`);

// ── Write new ─────────────────────────────────────────────────────────────────
writeFileSync(outPath, JSON.stringify(normalised, null, 0) + "\n", "utf8");
console.log(`  Written → words-el.json (${normalised.length.toLocaleString()} words, lowercase, no accents)`);
