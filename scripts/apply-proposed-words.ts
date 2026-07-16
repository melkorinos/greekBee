#!/usr/bin/env tsx
// apply-proposed-words.ts — adds a human-reviewed list of derived/proposed words
// to the dataset (words-el.json + leksiarxeio/words-{N}.json + premade re-sync).
//
// This is the *inject* half of the /apply-nominations proposer flow: the agent
// generates morphological relatives of freshly-accepted words, the developer
// prunes the list, and the survivors are applied here. Unlike apply-nominations
// it NEVER touches the DB — the words come from a local reviewed list, not the
// nominations table. Add-only (no removes). Words already present are skipped.
//
// Usage:
//   npm run apply-proposed -- word1 word2 ...
//   npm run apply-proposed:dry -- word1 word2 ...
//   npm run apply-proposed -- --file path/to/list.txt   (# comments + whitespace-separated)
//
// Routing by length mirrors apply-nominations:
//   len ≤ 3  → words-el.json only
//   len 4–8  → words-el.json AND src/data/leksiarxeio/words-{N}.json
//   len > 8  → words-el.json only (no leksiarxeio bucket) — still re-synced into puzzles
//
// Premade re-sync goes through the same registry as apply-nominations
// (scripts/lib/resync/), so a word injected here keeps every dictionary-derived
// game correct — not just Leksokipos.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { normalizeLetters } from "@/lib/normalize";

import { RESYNC_REGISTRY } from "./lib/resync/registry";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

// ── Collect input words (positional args and/or --file) ───────────────────────
const words: string[] = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--dry-run") continue;
  if (a === "--file") {
    const raw = readFileSync(args[++i], "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const clean = line.replace(/#.*$/, "").trim();      // drop # comments
      if (clean) words.push(...clean.split(/\s+/));
    }
    continue;
  }
  words.push(a);
}

if (words.length === 0) {
  console.error("No words given. Pass words as args or via --file <path>.");
  process.exit(1);
}

// ── File helpers (match apply-nominations serialisation exactly) ──────────────
// words-el.json is the dictionary itself — the source every adapter derives from
// — so this script owns it directly. Everything downstream is a registry adapter.
const wordsElPath = join(__dirname, "../src/data/words-el.json");

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

// ── Apply ─────────────────────────────────────────────────────────────────────
const wordsEl = readJson<string[]>(wordsElPath);
const wordsElSet = new Set(wordsEl);

const added: string[] = [];
const skipped: string[] = [];

for (const raw of words) {
  const word = normalizeLetters(raw);
  const len = [...word].length;
  if (wordsElSet.has(word)) {
    console.log(`  SKIP  (already exists) → ${word}`);
    skipped.push(word);
    continue;
  }
  console.log(`  ADD   (len ${len}) → ${word}`);
  added.push(word);
  wordsElSet.add(word);
  if (!isDryRun) wordsEl.push(word);
}

if (added.length === 0) {
  console.log(`\nNothing to add (${skipped.length} already present). No files written.`);
  process.exit(0);
}

// ── The dictionary itself ─────────────────────────────────────────────────────
if (!isDryRun) {
  writeFileSync(wordsElPath, JSON.stringify(wordsEl.sort()), "utf8");
  console.log(`\nUpdated src/data/words-el.json`);
}

// ── Premade-data re-sync (every dictionary-derived game) ──────────────────────
const warnings: string[] = [];

for (const game of RESYNC_REGISTRY) {
  const report = game.apply({ added, removed: [] }, { dryRun: isDryRun });
  warnings.push(...report.warnings);

  if (report.changed.length === 0) {
    console.log(`\n${game.id}: no premade data affected — unchanged.`);
    continue;
  }

  console.log(
    `\n${game.id}: re-sync${isDryRun ? " [DRY RUN]" : ""} — ${report.changed.length} item(s) affected`,
  );
  for (const c of report.changed) {
    if (c.added.length) console.log(`  ${c.id ?? "(no id)"}: +${c.added.join(", +")}`);
  }
  if (!isDryRun) {
    console.log(`Updated ${game.id} premade data.`);
  }
}

if (warnings.length > 0) {
  console.log(`\n⚠ Manual action required:`);
  for (const w of warnings) console.log(`  - ${w}`);
}

console.log(`\nSummary: +${added.length} added, ${skipped.length} skipped${isDryRun ? " [DRY RUN]" : ""}.`);
if (!isDryRun) console.log("\nNext step: review the git diff, then npm run build && deploy.");
