/**
 * parse-dictionary.ts
 *
 * Converts a Hunspell .dic file into a plain JSON word array.
 * Optionally merges with an existing word list JSON so no hand-crafted words are lost.
 *
 * Usage:
 *   npm run parse-dict -- --input=path/to/el.dic --output=src/data/words-el.json
 *   npm run parse-dict -- --input=path/to/el.dic --output=src/data/words-el.json --merge=src/data/words-el-extra.json
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
 *   - Merges any extra words from --merge file (union, then re-sort)
 */

import fs from "fs";
import path from "path";

// ── CLI argument parsing ───────────────────────────────────────────────────────

function getArg(name: string, fallback?: string): string | undefined {
  const flag = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(flag));
  if (!arg) return fallback;
  return arg.slice(flag.length);
}

function requireArg(name: string): string {
  const val = getArg(name);
  if (!val) {
    console.error(`❌  Missing required argument: --${name}`);
    process.exit(1);
  }
  return val;
}

const inputPath  = path.resolve(requireArg("input"));
const outputPath = path.resolve(requireArg("output"));
const mergePath  = getArg("merge") ? path.resolve(getArg("merge")!) : undefined;

// ── Parse .dic file ────────────────────────────────────────────────────────────

console.log(`\nReading dictionary: ${inputPath}`);
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

console.log(`  ${words.size.toLocaleString()} words from dictionary`);

// ── Merge extra words ──────────────────────────────────────────────────────────

if (mergePath) {
  if (!fs.existsSync(mergePath)) {
    console.warn(`⚠️  Merge file not found, skipping: ${mergePath}`);
  } else {
    const extra: string[] = JSON.parse(fs.readFileSync(mergePath, "utf-8"));
    let added = 0;
    for (const word of extra) {
      const w = word.trim().toLowerCase();
      if (w.length >= 4 && !words.has(w)) {
        words.add(w);
        added++;
      }
    }
    console.log(`  +${added} words merged from: ${mergePath}`);
  }
}

const sorted = Array.from(words).sort();

// ── Write output ──────────────────────────────────────────────────────────────

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(sorted, null, 2), "utf-8");

console.log(`✓ Written ${sorted.length.toLocaleString()} words → ${outputPath}`);
