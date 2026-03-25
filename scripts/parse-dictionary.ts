/**
 * parse-dictionary.ts
 *
 * Converts a Hunspell .dic file into a plain JSON word array.
 *
 * Usage:
 *   npm run parse-dict -- --input=path/to/el.dic --output=src/data/words-el.json
 *
 * The .dic format is:
 *   123456          ← first line is the word count (ignored)
 *   word/FLAGS      ← subsequent lines; we keep only the part before "/"
 *
 * Filters applied:
 *   - Strips Hunspell suffix flags (everything after "/")
 *   - Lowercases all words
 *   - Removes words shorter than 4 letters (can't score in Spelling Bee)
 *   - Deduplicates
 */

import fs from "fs";
import path from "path";

// ── CLI argument parsing ───────────────────────────────────────────────────────

function getArg(name: string): string {
  const flag = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(flag));
  if (!arg) {
    console.error(`Missing required argument: --${name}`);
    process.exit(1);
  }
  return arg.slice(flag.length);
}

const inputPath = path.resolve(getArg("input"));
const outputPath = path.resolve(getArg("output"));

// ── Parse ─────────────────────────────────────────────────────────────────────

console.log(`Reading: ${inputPath}`);
const raw = fs.readFileSync(inputPath, "utf-8");
const lines = raw.split(/\r?\n/);

const words = new Set<string>();

for (const line of lines) {
  // Skip empty lines and the word-count header line
  if (!line.trim() || /^\d+$/.test(line.trim())) continue;

  // Strip Hunspell flags (e.g. "αγάπη/ABCDE" → "αγάπη")
  const word = line.split("/")[0].trim().toLowerCase();

  // Keep only words of 4+ characters
  if (word.length >= 4) {
    words.add(word);
  }
}

const sorted = Array.from(words).sort();

// ── Write output ──────────────────────────────────────────────────────────────

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(sorted, null, 2), "utf-8");

console.log(`✓ Written ${sorted.length.toLocaleString()} words → ${outputPath}`);
