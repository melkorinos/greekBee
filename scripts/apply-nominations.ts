#!/usr/bin/env tsx
// apply-nominations.ts — applies admin-reviewed Leksikastirio nominations to the dataset.
//
// Run it from the repo (typically via `npm run apply-nominations`, which loads
// your gitignored .env). It reads the DB and writes local JSON only — it never
// builds, commits, or deploys. Review the git diff, then build & deploy yourself.
//
// Usage:
//   npm run apply-nominations          (tsx --env-file-if-exists=.env … )
//   npm run apply-nominations:dry      (--dry-run: preview, no writes)
//
// Required env vars (in .env / .env.local, or exported in shell):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// What a Nomination's (direction × status) means — only `accepted` rows act on
// the dataset; `rejected` rows are housekeeping, reported but never deleted:
//   accepted + add     →  add word to dictionary + leksiarxeio lists + re-sync puzzles
//   accepted + remove  →  delete word from dictionary + leksiarxeio lists + re-sync puzzles
//   rejected (either)  →  no dataset change (already hidden from the UI; row retained)
//
// Routing by word length (word-list files):
//   len ≤ 3  →  words-el.json only
//   len 4–8  →  words-el.json  AND  src/data/leksiarxeio/words-{N}.json
//   remove   →  cascades to all files the word appears in
//
// Premade-data re-sync: several games ship pre-built data derived from
// words-el.json (e.g. each Leksokipos puzzle embeds its own pre-computed
// `validWords`). After editing the dictionary we patch that data surgically via
// the re-sync registry (scripts/lib/resync/) so removed words stop scoring and
// added words start scoring. Coupled into this one script on purpose — a
// separate, skippable re-sync step is exactly how it got missed before.

import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { join } from "path";

import { normalizeLetters } from "@/lib/normalize";

import { RESYNC_REGISTRY } from "./lib/resync/registry";

interface Nomination {
  id: string;
  word: string;
  direction: "add" | "remove";
}

const isDryRun = process.argv.includes("--dry-run");

// ── Env ───────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ── Word list helpers ─────────────────────────────────────────────────────────

const wordsElPath = join(__dirname, "../src/data/words-el.json");

function readWordsEl(): string[] {
  return JSON.parse(readFileSync(wordsElPath, "utf8")) as string[];
}

function writeWordsEl(words: string[]): void {
  writeFileSync(wordsElPath, JSON.stringify(words.sort()), "utf8");
}

const LEKSIARXEIO_LENGTHS = [4, 5, 6, 7, 8];

function leksiarxeioPath(n: number): string {
  return join(__dirname, `../src/data/leksiarxeio/words-${n}.json`);
}

function readLeksiarxeioWords(n: number): string[] {
  return JSON.parse(readFileSync(leksiarxeioPath(n), "utf8")) as string[];
}

function writeLeksiarxeioWords(n: number, words: string[]): void {
  writeFileSync(leksiarxeioPath(n), JSON.stringify(words.sort()), "utf8");
}

// ── Main ──────────────────────────────────────────────────────────────────────
// Wrapped in main() rather than using top-level await: package.json has no
// "type": "module", so tsx compiles these scripts as CJS (same shape as every
// sibling data script, which is also why __dirname is the plain CJS global).

async function main(): Promise<void> {
  const { data: nominations, error } = await supabase
    .from("nominations")
    .select("id, word, direction")
    .eq("status", "accepted")
    .is("reviewed_at", null)
    .returns<Nomination[]>();

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }

  if (!nominations || nominations.length === 0) {
    console.log("No accepted nominations to apply.");
    process.exit(0);
  }

  console.log(`Found ${nominations.length} accepted nomination(s)${isDryRun ? " [DRY RUN]" : ""}:\n`);

  // Load all files once upfront
  let wordsEl = readWordsEl();
  const leksiarxeio: Record<number, string[]> = {};
  for (const n of LEKSIARXEIO_LENGTHS) {
    leksiarxeio[n] = readLeksiarxeioWords(n);
  }

  const added: string[] = [];
  const removed: string[] = [];
  const skipped: string[] = [];

  for (const nom of nominations) {
    const word = normalizeLetters(nom.word);
    const len = word.length;

    if (nom.direction === "add") {
      if (wordsEl.includes(word)) {
        console.log(`  SKIP  (already exists) → ${word}`);
        skipped.push(word);
      } else {
        console.log(`  ADD   (len ${len}) → ${word}`);
        added.push(word);
        if (!isDryRun) {
          wordsEl.push(word);
          if (LEKSIARXEIO_LENGTHS.includes(len)) {
            leksiarxeio[len].push(word);
          }
        }
      }
    } else if (nom.direction === "remove") {
      if (!wordsEl.includes(word)) {
        console.log(`  SKIP  (not in list)    → ${word}`);
        skipped.push(word);
      } else {
        console.log(`  REMOVE (len ${len}) → ${word}`);
        removed.push(word);
        if (!isDryRun) {
          wordsEl = wordsEl.filter((w) => w !== word);
          if (LEKSIARXEIO_LENGTHS.includes(len)) {
            leksiarxeio[len] = leksiarxeio[len].filter((w) => w !== word);
          }
        }
      }
    }
  }

  const wordListChanged = added.length > 0 || removed.length > 0;

  // ── Word-list files ─────────────────────────────────────────────────────────
  if (!isDryRun && wordListChanged) {
    writeWordsEl(wordsEl);
    console.log(`\nUpdated src/data/words-el.json`);

    // Write only leksiarxeio files that were actually touched
    const touchedLengths = [...new Set(
      [...added, ...removed]
        .map((w) => w.length)
        .filter((n) => LEKSIARXEIO_LENGTHS.includes(n))
    )];
    for (const n of touchedLengths) {
      writeLeksiarxeioWords(n, leksiarxeio[n]);
      console.log(`Updated src/data/leksiarxeio/words-${n}.json`);
    }
  }

  // ── Premade-data re-sync (every dictionary-derived game) ────────────────────
  // Each registered adapter patches its own derived data so removed words stop
  // scoring and added words start scoring. Runs in dry-run too, as a preview
  // (the registry gates the write, not this loop).
  if (wordListChanged) {
    const warnings: string[] = [];

    for (const game of RESYNC_REGISTRY) {
      const report = game.apply({ added, removed }, { dryRun: isDryRun });
      warnings.push(...report.warnings);

      if (report.changed.length === 0) {
        console.log(`\n${game.id}: no premade data affected — unchanged.`);
        continue;
      }

      console.log(
        `\n${game.id}: re-sync${isDryRun ? " [DRY RUN]" : ""} — ${report.changed.length} item(s) affected`,
      );
      for (const c of report.changed) {
        const parts: string[] = [];
        if (c.added.length) parts.push(`+${c.added.join(", +")}`);
        if (c.removed.length) parts.push(`-${c.removed.join(", -")}`);
        console.log(`  ${c.id ?? "(no id)"}: ${parts.join("  ")}`);
      }
      if (!isDryRun) {
        console.log(`Updated ${game.id} premade data.`);
      }
    }

    // Things no adapter could auto-fix — surfaced last so they are the final
    // thing the operator reads before touching the git diff.
    if (warnings.length > 0) {
      console.log(`\n⚠ Manual action required:`);
      for (const w of warnings) console.log(`  - ${w}`);
    }
  }

  // ── Mark accepted rows reviewed; report rejected (housekeeping only) ────────
  if (!isDryRun) {
    const ids = nominations.map((n) => n.id);
    await supabase
      .from("nominations")
      .update({ reviewed_at: new Date().toISOString() })
      .in("id", ids);

    console.log(`Marked ${ids.length} row(s) reviewed_at = now()`);
  }

  // Rejected nominations are retained as history and already hidden from the UI
  // (status = 'rejected'). Report the count so the operator knows the backlog size.
  const { count: rejectedCount } = await supabase
    .from("nominations")
    .select("id", { count: "exact", head: true })
    .eq("status", "rejected");

  if (typeof rejectedCount === "number") {
    console.log(`Rejected nominations in backlog: ${rejectedCount} (hidden, retained)`);
  }

  console.log(`\nSummary: +${added.length} added, -${removed.length} removed, ${skipped.length} skipped.`);
  if (!isDryRun && wordListChanged) {
    console.log("\nNext step: review the git diff, then npm run build && deploy.");
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
