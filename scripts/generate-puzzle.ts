/**
 * generate-puzzle.ts
 *
 * Generates a Spelling Bee puzzle from a word list JSON file.
 * Finds all valid words for the given letter set, then appends the puzzle
 * to the appropriate puzzles-{lang}.json file.
 *
 * Usage:
 *   npm run generate-puzzle -- --lang=el --center=α --outer=π,ο,λ,ε,μ,σ --date=2026-03-26
 *
 * Options:
 *   --lang      Language code: en | el
 *   --center    The mandatory centre letter (single character)
 *   --outer     6 outer letters separated by commas
 *   --date      Puzzle date in YYYY-MM-DD format (defaults to today)
 *   --words     Path to word list JSON (defaults to src/data/words-{lang}.json)
 *   --dry-run   Print results without writing to disk
 */

import fs from "fs";
import path from "path";

// ── CLI argument parsing ───────────────────────────────────────────────────────

function getArg(name: string, fallback?: string): string {
  const flag = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(flag));
  if (!arg) {
    if (fallback !== undefined) return fallback;
    console.error(`❌  Missing required argument: --${name}`);
    process.exit(1);
  }
  return arg.slice(flag.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const lang     = getArg("lang");
const center   = getArg("center").toLowerCase();
const outer    = getArg("outer").split(",").map((l) => l.trim().toLowerCase());
const today    = new Date().toISOString().split("T")[0];
const date     = getArg("date", today);
const isDryRun = hasFlag("dry-run");

const defaultWordList = path.resolve(`src/data/words-${lang}.json`);
const wordListPath    = path.resolve(getArg("words", defaultWordList));
const puzzleFilePath  = path.resolve(`src/data/puzzles-${lang}.json`);

// ── Validate inputs ────────────────────────────────────────────────────────────

if (outer.length !== 6) {
  console.error(`❌  --outer must contain exactly 6 letters (got ${outer.length})`);
  process.exit(1);
}

if (center.length !== 1) {
  console.error(`❌  --center must be a single letter`);
  process.exit(1);
}

if (!fs.existsSync(wordListPath)) {
  console.error(`❌  Word list not found: ${wordListPath}`);
  console.error(`    Run "npm run parse-dict" first to generate it from a .dic file.`);
  process.exit(1);
}

// ── Letter normalisation ───────────────────────────────────────────────────────

/**
 * Strips Unicode diacritics/accents and lowercases.
 * Allows matching accented Greek words (αγάπη) against unaccented puzzle letters (α).
 * Also normalises Greek final sigma ς → σ.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")                          // decompose e.g. ά → α + combining accent
    .replace(/[\u0300-\u036f]/g, "")           // strip all combining diacritical marks
    .replace(/ς/g, "σ");                       // final sigma → regular sigma
}

// ── Word filtering ─────────────────────────────────────────────────────────────

const allLetters     = new Set([center, ...outer].map(normalize));
const centerNorm     = normalize(center);

console.log(`\n🍯  Generating puzzle for [${lang}]`);
console.log(`    Centre : ${center.toUpperCase()}`);
console.log(`    Outer  : ${outer.map((l) => l.toUpperCase()).join(" ")}`);
console.log(`    Date   : ${date}`);
console.log(`    Words  : ${wordListPath}\n`);

const wordList: string[] = JSON.parse(fs.readFileSync(wordListPath, "utf-8"));

const validWords: string[] = [];
const pangrams:   string[] = [];

for (const word of wordList) {
  const norm = normalize(word);

  // Must be 4+ letters
  if (norm.length < 4) continue;

  // Must contain the centre letter
  if (!norm.includes(centerNorm)) continue;

  // Every letter must be in the puzzle set
  if (!Array.from(norm).every((ch) => allLetters.has(ch))) continue;

  validWords.push(word);  // store original (accented) form

  // Pangram: uses all 7 letters at least once
  const isPangram = [...allLetters].every((l) => norm.includes(l));
  if (isPangram) pangrams.push(word);
}

// ── Scoring summary ────────────────────────────────────────────────────────────

function scoreWord(word: string): number {
  const len = normalize(word).length;
  const base = len === 4 ? 1 : len;
  const bonus = pangrams.includes(word) ? 7 : 0;
  return base + bonus;
}

const totalScore = validWords.reduce((sum, w) => sum + scoreWord(w), 0);

console.log(`✓ Found ${validWords.length} valid words`);
console.log(`  Pangrams (${pangrams.length}): ${pangrams.join(", ") || "none"}`);
console.log(`  Max score: ${totalScore} pts\n`);

if (validWords.length < 15) {
  console.warn(`⚠️  Only ${validWords.length} words found — consider choosing different letters.`);
}

// ── Build puzzle object ────────────────────────────────────────────────────────

const puzzleId = `${date}-${lang}`;

const newPuzzle = {
  id: puzzleId,
  language: lang,
  date,
  centerLetter: center,
  outerLetters: outer,
  validWords,
};

if (isDryRun) {
  console.log("Dry run — puzzle NOT written. Preview:");
  console.log(JSON.stringify(newPuzzle, null, 2));
  process.exit(0);
}

// ── Append to puzzles file ─────────────────────────────────────────────────────

let existing: typeof newPuzzle[] = [];

if (fs.existsSync(puzzleFilePath)) {
  existing = JSON.parse(fs.readFileSync(puzzleFilePath, "utf-8"));

  // Warn if a puzzle for this date already exists
  if (existing.some((p) => p.id === puzzleId)) {
    console.warn(`⚠️  Puzzle "${puzzleId}" already exists in ${puzzleFilePath}.`);
    console.warn(`    Remove it first or use a different --date.`);
    process.exit(1);
  }
}

existing.push(newPuzzle);
fs.writeFileSync(puzzleFilePath, JSON.stringify(existing, null, 2), "utf-8");

console.log(`✓ Puzzle "${puzzleId}" appended → ${puzzleFilePath}`);
