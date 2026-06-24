#!/usr/bin/env node
// fetch-additions.mjs — STEP 1 (read-only). Download admin-approved word
// ADDITIONS from Supabase to a local additions.json, so the local cleanup can
// merge them in one pass. Records each row's id so step 4 can mark exactly
// these rows reviewed afterwards.
//
// Run on a machine where the Supabase env vars are set (your .env / .env.local):
//   node --env-file-if-exists=.env --env-file-if-exists=.env.local fetch-additions.mjs
//
// This NEVER writes to Supabase — it only reads.

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key);

// Same selector apply-nominations uses, narrowed to additions: accepted +
// not-yet-applied. (If you also have pending accepted `remove` nominations,
// change direction to fetch those too — they'd just join the removal set.)
const { data, error } = await supabase
  .from("nominations")
  .select("id, word")
  .eq("status", "accepted")
  .eq("direction", "add")
  .is("reviewed_at", null);

if (error) {
  console.error("Supabase error:", error.message);
  process.exit(1);
}

const additions = (data ?? []).map((r) => ({ id: r.id, word: r.word }));
const out = { fetched_at: new Date().toISOString(), additions };
writeFileSync(join(__dirname, "additions.json"), JSON.stringify(out, null, 2), "utf8");

console.log(`Fetched ${additions.length} approved addition(s) → additions.json`);
for (const a of additions) console.log(`  + ${a.word}`);
console.log("\nNext: node apply-cleanup.mjs   (dry run), then --in-place.");
