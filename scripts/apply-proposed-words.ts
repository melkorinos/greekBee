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

import { readFileSync } from "fs";

import { applyDictionaryEdits } from "./lib/resync/applyDictionaryEdits";

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

// ── Apply ─────────────────────────────────────────────────────────────────────
// Add-only: dictionary I/O, dedup, the re-sync walk and the report all belong to
// the orchestrator — this script only knows how to source its words.
const { added, skipped, wordListChanged } = applyDictionaryEdits(
  words.map((word) => ({ word, direction: "add" as const })),
  { dryRun: isDryRun },
);

if (!wordListChanged) {
  console.log(`\nNothing to add (${skipped.length} already present). No files written.`);
  process.exit(0);
}

console.log(`\nSummary: +${added.length} added, ${skipped.length} skipped${isDryRun ? " [DRY RUN]" : ""}.`);
if (!isDryRun) console.log("\nNext step: review the git diff, then npm run build && deploy.");
