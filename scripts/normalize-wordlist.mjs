// normalize-wordlist.mjs
// Reads words-el.raw.json (the original accented Greek dictionary — immutable
// source of truth), normalises each word (strip accents, ς→σ, lowercase),
// filters to a target letter length, deduplicates, and writes the result to
// src/data/wordle/words-<length>.json.
//
// Usage: node scripts/normalize-wordlist.mjs --length=5
//
// words-el.raw.json is NEVER modified by this script.

import { dirname, join } from "path";
import { mkdirSync, readFileSync, writeFileSync } from "fs";

import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Parse args ────────────────────────────────────────────────────────────────
const lengthArg = process.argv.find((a) => a.startsWith("--length="));
const targetLength = lengthArg ? parseInt(lengthArg.split("=")[1], 10) : 5;

if (isNaN(targetLength) || targetLength < 3 || targetLength > 8) {
  console.error("Usage: node scripts/normalize-wordlist.mjs --length=5  (3–8)");
  process.exit(1);
}

// ── Normalize ─────────────────────────────────────────────────────────────────
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")                  // decompose accented chars
    .replace(/[\u0300-\u036f]/g, "")  // strip combining diacritics
    .replace(/ς/g, "σ");             // final sigma → regular sigma
}

// ── Read source (original accented dictionary) ────────────────────────────────
const sourcePath = join(root, "src/data/words-el.raw.json");
const raw = JSON.parse(readFileSync(sourcePath, "utf8"));
console.log(`Source: ${raw.length.toLocaleString()} words in words-el.raw.json`);

// ── Normalize, filter to target length, deduplicate ───────────────────────────
const unique = [...new Set(raw.map(normalize).filter((w) => w.length === targetLength))].sort();
console.log(`${targetLength}-letter words: ${unique.length}`);

// ── Write output ──────────────────────────────────────────────────────────────
const outDir = join(root, "src/data/wordle");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `words-${targetLength}.json`);
writeFileSync(outPath, JSON.stringify(unique), "utf8");
console.log(`Written → src/data/wordle/words-${targetLength}.json`);
