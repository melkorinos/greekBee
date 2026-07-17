/**
 * generate-leksodromia-anagrams.ts
 *
 * Precomputes the "valid anagram alternates" map for Leksodromia and writes it
 * to src/data/leksodromia/anagramAlternates.json.
 *
 * Why this exists: a Leksodromia rack is a scramble of one canonical answer, but
 * the same letters often spell OTHER valid Greek words (e.g. στερησω ↔ σωτηρεσ).
 * The player should get credit for any of them, not just the one answer. Deciding
 * that needs the dictionary — so we resolve it offline here rather than shipping
 * the MB-scale guess lists into the Leksodromia route (Fluid cold-start budget).
 *
 * For every word in Leksiarxeio's curated answer pools (the only words Leksodromia
 * can ever pose), we list its anagrams found in the same-length guess list
 * (words-N.json), excluding the word itself. Output is keyed by the answer word;
 * words with no alternates are omitted. Keys and values are sorted so re-running
 * on unchanged inputs reproduces byte-identical output.
 *
 * Normalisation: the Leksiarxeio source lists are already stored in the
 * platform's normalised form (lowercase, accent-free, final sigma ς → σ — see
 * normalizeLetters), so keys and alternates inherit it verbatim. That is what
 * lets the reducer match a rack-formed input directly: Leksodromia tiles are the
 * (normalised) answer's letters, so the built input is normalised by
 * construction and needs no runtime normalisation before the accepted-set check.
 *
 * Usage:
 *   npm run generate-leksodromia-anagrams
 */

import fs from "fs";
import path from "path";

const LENGTHS = [4, 5, 6, 7, 8] as const;
const DATA_DIR = path.join(__dirname, "..", "src", "data", "leksiarxeio");
const OUT_FILE = path.join(__dirname, "..", "src", "data", "leksodromia", "anagramAlternates.json");

const sortKey = (word: string): string => [...word].sort().join("");

function loadJson(file: string): string[] {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as string[];
}

const alternates: Record<string, string[]> = {};

for (const length of LENGTHS) {
  const words   = loadJson(path.join(DATA_DIR, `words-${length}.json`));
  const answers = loadJson(path.join(DATA_DIR, `answers-${length}.json`));

  // Anagram groups over the full guess list: sorted-letters → words.
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const key = sortKey(word);
    const bucket = groups.get(key);
    if (bucket) bucket.push(word);
    else groups.set(key, [word]);
  }

  for (const answer of answers) {
    const alts = (groups.get(sortKey(answer)) ?? [])
      .filter((w) => w !== answer)
      .sort();
    if (alts.length > 0) alternates[answer] = alts;
  }
}

// Stable, sorted-by-key output for clean diffs.
const sorted = Object.fromEntries(
  Object.keys(alternates).sort().map((k) => [k, alternates[k]]),
);

fs.writeFileSync(OUT_FILE, JSON.stringify(sorted) + "\n", "utf-8");

const wordCount = Object.keys(sorted).length;
const altCount  = Object.values(sorted).reduce((n, a) => n + a.length, 0);
console.log(`Wrote ${wordCount} answer words with ${altCount} alternates → ${path.relative(process.cwd(), OUT_FILE)}`);
