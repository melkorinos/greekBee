#!/usr/bin/env node
// mark-additions-reviewed.mjs — STEP 4 (the only Supabase WRITE). Run this
// LAST, only after apply-cleanup --in-place succeeded AND you've verified the
// result (tests/lint/build, diff looks right).
//
// Sets reviewed_at = now() on exactly the addition rows recorded in
// additions.json — the project's convention for "applied, drop from the active
// queue" (rows are retained as history, NOT deleted). Idempotent: re-running is
// harmless (rows already reviewed simply stay reviewed).
//
//   node --env-file-if-exists=.env --env-file-if-exists=.env.local mark-additions-reviewed.mjs
//
// Use --confirm to actually write; without it, this only previews.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const confirm = process.argv.includes("--confirm");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const { additions } = JSON.parse(readFileSync(join(__dirname, "additions.json"), "utf8"));
const ids = additions.map((a) => a.id);

if (ids.length === 0) {
  console.log("No addition ids in additions.json — nothing to mark.");
  process.exit(0);
}

console.log(`Will mark ${ids.length} addition row(s) reviewed_at = now():`);
for (const a of additions) console.log(`  ${a.id}  ${a.word}`);

if (!confirm) {
  console.log("\n[preview] pass --confirm to write to Supabase.");
  process.exit(0);
}

const supabase = createClient(url, key);
const { error } = await supabase
  .from("nominations")
  .update({ reviewed_at: new Date().toISOString() })
  .in("id", ids);

if (error) {
  console.error("Supabase error:", error.message);
  process.exit(1);
}
console.log(`\n✓ Marked ${ids.length} row(s) reviewed. They will no longer reapply.`);
