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

import { createClient } from "@supabase/supabase-js";

import { applyDictionaryEdits } from "./lib/resync/applyDictionaryEdits";

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

  // Dictionary I/O, dedup routing, the re-sync registry walk and the report are
  // all the orchestrator's — this script only knows how to source its edits.
  const { added, removed, skipped, wordListChanged } = applyDictionaryEdits(
    nominations,
    { dryRun: isDryRun },
  );

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
