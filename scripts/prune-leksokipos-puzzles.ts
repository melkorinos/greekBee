/**
 * prune-leksokipos-puzzles.ts
 *
 * One-off corpus surgery for the 2026-07-30 difficulty rebalance: drop every
 * committed Leksokipos daily puzzle that fails the quality gates in
 * scripts/lib/leksokipos/puzzleQuality.ts, then reflow the survivors onto
 * consecutive dates starting from the corpus's existing first date.
 *
 * Why reflow rather than leave holes: getPuzzleForDate() (and its slim mirror
 * getPuzzleStubForDate()) fall back to the LAST puzzle in the array on a date
 * miss. A hole would not throw — it would silently serve the final 2028 puzzle
 * to every visitor on that day. Consecutive dates are therefore an invariant,
 * pinned by puzzleCorpusQuality.test.ts.
 *
 * Order is preserved (the array is already chronological), so getNextPuzzle(),
 * which cycles by array index, keeps working unchanged.
 *
 * Usage:
 *   npm run prune-leksokipos:dry    # report only, writes nothing
 *   npm run prune-leksokipos        # rewrite puzzles-el.json
 *
 * After a real run, regenerate the slim index:
 *   npm run generate-puzzle-index
 */

import fs from "fs";
import path from "path";

import { LEKSOKIPOS } from "../src/config/gameRules";
import type { LeksokiposPuzzle } from "../src/games/leksokipos/types";
import {
  countPangrams,
  meetsDifficultyRules,
  realisticWordsToGenius,
} from "./lib/leksokipos/puzzleQuality";

const isDryRun = process.argv.includes("--dry-run");

const puzzlePath = path.resolve("src/data/leksokipos/puzzles-el.json");
const puzzles = JSON.parse(fs.readFileSync(puzzlePath, "utf8")) as LeksokiposPuzzle[];

if (puzzles.length === 0) {
  console.error("❌  puzzles-el.json is empty — nothing to prune.");
  process.exit(1);
}

/** Advances an ISO date by N days, UTC-safe (no local-timezone drift). */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Classify ───────────────────────────────────────────────────────────────────
//
// Report the two gates separately as well as combined: they are independent
// rules (tedium vs. aesthetics) and knowing which one is doing the work is what
// tells you whether a threshold is worth moving.

const kept: LeksokiposPuzzle[] = [];
let failedPangramOnly = 0;
let failedWordsOnly = 0;
let failedBoth = 0;

for (const puzzle of puzzles) {
  const pangramFail = countPangrams(puzzle) >= LEKSOKIPOS.MAX_PANGRAMS;
  const wordsFail = realisticWordsToGenius(puzzle) >= LEKSOKIPOS.MAX_WORDS_TO_GENIUS;

  if (meetsDifficultyRules(puzzle)) {
    kept.push(puzzle);
    continue;
  }

  if (pangramFail && wordsFail) failedBoth++;
  else if (pangramFail) failedPangramOnly++;
  else failedWordsOnly++;
}

const removed = puzzles.length - kept.length;
const firstDate = puzzles[0].date;

// ── Reflow ─────────────────────────────────────────────────────────────────────
//
// Array order is already chronological and the filter preserves it, so the Nth
// survivor simply takes the Nth date from the original start.

const reflowed = kept.map((puzzle, i) => {
  const date = addDays(firstDate, i);
  return { ...puzzle, id: `${date}-${puzzle.language}`, date };
});

// ── Report ─────────────────────────────────────────────────────────────────────

const lastDate = reflowed[reflowed.length - 1].date;
const runwayYears = (reflowed.length / 365).toFixed(2);

console.log(`${isDryRun ? "DRY RUN — no files written" : "PRUNING"}\n`);
console.log(`  gates: pangrams < ${LEKSOKIPOS.MAX_PANGRAMS}, words-to-genius < ${LEKSOKIPOS.MAX_WORDS_TO_GENIUS}`);
console.log(`  (measured with SCORE_SCALE=${LEKSOKIPOS.SCORE_SCALE}, SOFT_CAP_KNEE=${LEKSOKIPOS.SOFT_CAP_KNEE}, SOFT_CAP_K=${LEKSOKIPOS.SOFT_CAP_K})\n`);
console.log(`  removed ${removed} / ${puzzles.length}`);
console.log(`    ${String(failedWordsOnly).padStart(4)} tedium only   (words-to-genius gate)`);
console.log(`    ${String(failedPangramOnly).padStart(4)} pangram only  (aesthetic gate)`);
console.log(`    ${String(failedBoth).padStart(4)} both\n`);
console.log(`  kept ${reflowed.length}`);
console.log(`  dates reflow ${firstDate} → ${lastDate}  (~${runwayYears} years of runway)\n`);

if (isDryRun) {
  console.log("Re-run without --dry-run to apply, then: npm run generate-puzzle-index");
  process.exit(0);
}

// ── Write ──────────────────────────────────────────────────────────────────────
// Pretty-printed (2-space) — match batch-generate.ts and the re-sync adapter.

fs.writeFileSync(puzzlePath, JSON.stringify(reflowed, null, 2), "utf8");

console.log(`✓ wrote ${reflowed.length} puzzles → ${puzzlePath}`);
console.log("→ now run: npm run generate-puzzle-index");
