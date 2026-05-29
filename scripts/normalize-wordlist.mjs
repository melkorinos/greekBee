// normalize-wordlist.mjs
// Reads words-el.json (the unified normalised Greek dictionary — 2+ letters),
// filters to a target letter length, deduplicates, and writes the result to
// src/data/leksiarxeio/words-<length>.json.
//
// Usage: node scripts/normalize-wordlist.mjs --length=5
//        node scripts/normalize-wordlist.mjs --length=2   (short words for VresTinFrasi)
//        node scripts/normalize-wordlist.mjs --length=3   (short words for VresTinFrasi)
//
// words-el.json is the single source of truth. Never modify it here.

import { dirname, join } from "path";
import { mkdirSync, readFileSync, writeFileSync } from "fs";

import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Parse args ────────────────────────────────────────────────────────────────
const lengthArg = process.argv.find((a) => a.startsWith("--length="));
const targetLength = lengthArg ? parseInt(lengthArg.split("=")[1], 10) : 5;

if (isNaN(targetLength) || targetLength < 2 || targetLength > 8) {
  console.error("Usage: node scripts/normalize-wordlist.mjs --length=5  (2–8)");
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

// ── Read source (unified normalised dictionary, 2+ letters) ──────────────────
const sourcePath = join(root, "src/data/words-el.json");
const raw = JSON.parse(readFileSync(sourcePath, "utf8"));
console.log(`Source: ${raw.length.toLocaleString()} words in words-el.json`);

// ── Normalize, filter to target length, deduplicate ───────────────────────────
const unique = [...new Set(raw.map(normalize).filter((w) => w.length === targetLength))].sort();
console.log(`${targetLength}-letter words: ${unique.length}`);

// ── Write output ──────────────────────────────────────────────────────────────
const outDir = join(root, "src/data/leksiarxeio");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `words-${targetLength}.json`);
writeFileSync(outPath, JSON.stringify(unique), "utf8");
console.log(`Written → src/data/leksiarxeio/words-${targetLength}.json`);
