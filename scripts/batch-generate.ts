/**
 * batch-generate.ts
 *
 * Generates many Spelling Bee puzzles from the Greek word list using random
 * letter combinations and appends them all to puzzles-el.json.
 *
 * Loads the word list once, builds a centre-letter index so each puzzle
 * attempt only scans words that contain the chosen centre letter — much
 * faster than a full scan for every attempt.
 *
 * Usage:
 *   npm run batch-generate
 *   npm run batch-generate -- --target=100 --min-words=30
 *
 * Options:
 *   --target     How many new puzzles to generate (default: 500)
 *   --min-words  Minimum valid-word count to accept a puzzle (default: 50)
 *   --lang       Language code (default: el)
 */

import fs from "fs";
import path from "path";

// ── CLI args ───────────────────────────────────────────────────────────────────

function getArg(name: string, fallback: string): string {
  const flag = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(flag));
  return arg ? arg.slice(flag.length) : fallback;
}

const TARGET    = parseInt(getArg("target",    "500"), 10);
const MIN_WORDS = parseInt(getArg("min-words", "50"),  10);
const LANG      = getArg("lang", "el");

// ── Greek letter pool ──────────────────────────────────────────────────────────
// All 24 Greek lowercase letters — random picks from the full alphabet.
const LETTER_POOL: string[] = [
  "α", "β", "γ", "δ", "ε", "ζ", "η", "θ",
  "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π",
  "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω",
];

// ── Normalisation ──────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip diacritics / accents
    .replace(/ς/g, "σ");              // final sigma → regular sigma
}

// ── Paths ──────────────────────────────────────────────────────────────────────

const wordListPath = path.resolve(`src/data/words-${LANG}.json`);
const puzzlePath   = path.resolve(`src/data/puzzles-${LANG}.json`);

if (!fs.existsSync(wordListPath)) {
  console.error(`❌  Word list not found: ${wordListPath}`);
  console.error(`    Run "npm run parse-dict" first.`);
  process.exit(1);
}

// ── Load & pre-process word list ───────────────────────────────────────────────

process.stdout.write("Loading word list… ");
const rawWords: string[] = JSON.parse(fs.readFileSync(wordListPath, "utf8"));
process.stdout.write(`${rawWords.length.toLocaleString()} raw words\n`);

process.stdout.write("Normalising & deduplicating… ");
const normalizedWords = [...new Set(rawWords.map(normalize).filter((w) => w.length >= 4))];
process.stdout.write(`${normalizedWords.length.toLocaleString()} unique normalised words\n`);

// Build centre-letter index: letter → all normalised words containing it
process.stdout.write("Building centre-letter index… ");
const byCenter = new Map<string, string[]>();
for (const word of normalizedWords) {
  const seen = new Set<string>();
  for (const ch of word) {
    if (!seen.has(ch)) {
      seen.add(ch);
      if (!byCenter.has(ch)) byCenter.set(ch, []);
      byCenter.get(ch)!.push(word);
    }
  }
}
process.stdout.write(`${byCenter.size} letters indexed\n\n`);

// ── Load existing puzzles ──────────────────────────────────────────────────────

const existing: {
  id: string;
  language: string;
  date: string;
  centerLetter: string;
  outerLetters: string[];
  validWords: string[];
}[] = JSON.parse(fs.readFileSync(puzzlePath, "utf8"));

// Track letter sets already used so we never duplicate a combination
const usedSets = new Set(
  existing.map((p) => [p.centerLetter, ...p.outerLetters].sort().join(""))
);

const lastDate = existing[existing.length - 1]?.date ?? "2026-04-01";

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

/** Pick n distinct random items from an array */
function pickDistinct<T>(pool: T[], n: number): T[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

/** Find all valid words for a puzzle letter set (uses the index) */
function findValidWords(center: string, outer: string[]): string[] {
  const allowed = new Set([center, ...outer]);
  return (byCenter.get(center) ?? []).filter((w) =>
    w.split("").every((ch) => allowed.has(ch))
  );
}

// ── Generate puzzles ───────────────────────────────────────────────────────────

console.log(`Generating ${TARGET} new puzzles (min ${MIN_WORDS} words each)…\n`);

const newPuzzles: typeof existing = [];
let attempts = 0;
let dayOffset = 1;

while (newPuzzles.length < TARGET) {
  attempts++;

  const [center, ...outer] = pickDistinct(LETTER_POOL, 7);
  const key = [center, ...outer].sort().join("");

  if (usedSets.has(key)) continue;

  const validWords = findValidWords(center, outer);
  if (validWords.length < MIN_WORDS) continue;

  usedSets.add(key);
  const date = addDays(lastDate, dayOffset++);
  const id   = `${date}-${LANG}`;

  newPuzzles.push({ id, language: LANG, date, centerLetter: center, outerLetters: outer, validWords });

  if (newPuzzles.length % 50 === 0 || newPuzzles.length === TARGET) {
    const pct = ((newPuzzles.length / TARGET) * 100).toFixed(0);
    console.log(`  ${newPuzzles.length}/${TARGET} (${pct}%)  — ${attempts} attempts so far`);
  }
}

// ── Write results ──────────────────────────────────────────────────────────────

const all = [...existing, ...newPuzzles];
fs.writeFileSync(puzzlePath, JSON.stringify(all, null, 2), "utf8");

console.log(`\n✓ ${newPuzzles.length} new puzzles added`);
console.log(`✓ ${all.length} total puzzles → ${puzzlePath}`);
console.log(`  (${attempts} attempts, ${(attempts / newPuzzles.length).toFixed(1)}x ratio)`);
