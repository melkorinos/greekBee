// curate-answers.mjs
// Filters the full normalised 5-letter word list (words-5.json) down to a
// curated ~1–2k answer pool of plausibly everyday Greek words.
//
// Strategy: whitelist of the most common Greek morphological word endings,
// combined with structural filters to remove foreign/proper/technical words.
//
// The output is deterministic and sorted; it is the starting point for manual
// curation — edit answers-5.json directly to add/remove words as needed.
//
// Usage: node scripts/curate-answers.mjs [--length=5]

import { dirname, join } from "path";
import { mkdirSync, readFileSync, writeFileSync } from "fs";

import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, "..");

const lengthArg    = process.argv.find((a) => a.startsWith("--length="));
const targetLength = lengthArg ? parseInt(lengthArg.split("=")[1], 10) : 5;

// ── Greek vowels (post-normalisation) ────────────────────────────────────────
const VOWELS = new Set([..."αεηιουω"]);
const isVowel = (ch) => VOWELS.has(ch);
const isCons  = (ch) => !VOWELS.has(ch);

// ── Common Greek morphological endings (post-normalisation ς→σ) ──────────────
// These cover the vast majority of everyday nouns, adjectives and verbs.
const COMMON_ENDS = new Set([
  // Nominative / genitive forms
  "ων", "ου", "οσ", "εσ", "ασ", "ησ",
  // Neuter nouns and adverbs
  "μα", "τα", "τη", "τι", "τo",
  // Verb endings (indicative / subjunctive)
  "ει", "ουν", "νει",
  // Remaining high-frequency endings
  "οι", "ια", "ον",
]);

function hasCommonEnding(word) {
  // Check 2-char and 3-char endings
  const e2 = word.slice(-2);
  const e3 = word.slice(-3);
  return COMMON_ENDS.has(e2) || COMMON_ENDS.has(e3);
}

// ── Structural filters ───────────────────────────────────────────────────────

function hasEnoughVowels(word) {
  return [...word].filter(isVowel).length >= 2;
}

function noLongConsonantRun(word) {
  let run = 0;
  for (const ch of word) {
    run = isCons(ch) ? run + 1 : 0;
    if (run >= 3) return false;
  }
  return true;
}

function noExcessiveRepeat(word) {
  for (const ch of new Set(word)) {
    if ([...word].filter((c) => c === ch).length >= 3) return false;
  }
  return true;
}

// Words starting with double-vowel are almost always proper nouns / loanwords
function noDoubleVowelStart(word) {
  return !(isVowel(word[0]) && isVowel(word[1]) && word[0] === word[1]);
}

// Prefixes/suffixes that skew heavily toward ancient / technical vocabulary
const BAD_STARTS = ["αβ", "αγν", "αδη", "αζω", "αθω", "ακρ", "αλγ", "αλκ",
                    "βδ", "γν", "κτ", "μν", "πτ", "φθ", "χθ", "τμ"];
const BAD_ENDS   = ["νθ", "ρξ", "σθ", "ρκτ", "γχ"];

function noSuspiciousAffix(word) {
  for (const p of BAD_STARTS) if (word.startsWith(p)) return false;
  for (const s of BAD_ENDS)   if (word.endsWith(s))   return false;
  return true;
}

// ── Read source ───────────────────────────────────────────────────────────────
const srcPath = join(root, `src/data/leksiarxeio/words-${targetLength}.json`);
const words   = JSON.parse(readFileSync(srcPath, "utf8"));
console.log(`Source: ${words.length.toLocaleString()} ${targetLength}-letter words`);

// ── Apply filters ─────────────────────────────────────────────────────────────
const curated = words
  .filter(hasCommonEnding)
  .filter(hasEnoughVowels)
  .filter(noLongConsonantRun)
  .filter(noExcessiveRepeat)
  .filter(noDoubleVowelStart)
  .filter(noSuspiciousAffix)
  .sort();

console.log(`After filtering: ${curated.length.toLocaleString()} words`);
console.log(`Covers ${Math.ceil(curated.length / 365)} year(s) of daily puzzles.`);

// ── Write output ──────────────────────────────────────────────────────────────
const outDir  = join(root, `src/data/leksiarxeio`);
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `answers-${targetLength}.json`);
writeFileSync(outPath, JSON.stringify(curated, null, 2), "utf8");
console.log(`Written → src/data/leksiarxeio/answers-${targetLength}.json`);
