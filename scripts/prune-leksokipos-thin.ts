/**
 * prune-leksokipos-thin.ts
 *
 * One-off corpus surgery for the 2026-08-13 "thin garden" cut: drop every
 * FUTURE Leksokipos daily puzzle whose max score falls under MIN_MAX_SCORE,
 * then reflow the survivors onto consecutive dates starting at SCORE_FLOOR_FROM.
 *
 * Why only from SCORE_FLOOR_FROM (see gameRules.ts) and not from the start of
 * the corpus, the way prune-leksokipos-puzzles.ts reflowed in July: stored
 * rounds (game_state) and leaderboard rows (game_scores) are keyed on the puzzle
 * DATE. Re-dating a past day silently changes which garden that day served, so
 * every round already played against it comes back attached to a different
 * board. That is the production incident the July prune caused, and freezing
 * history is what prevents a repeat. The 15 sub-floor puzzles before the
 * boundary therefore stay exactly where they are.
 *
 * Today itself IS re-pointed — that is intentional, today's garden is one of the
 * thin ones — so today's rows must be cleared server-side after deploy:
 *   delete from game_state  where game_id = 'leksokipos' and puzzle_date = '<boundary>';
 *   delete from game_scores where game_id = 'leksokipos' and puzzle_date = '<boundary>';
 * Devices that already played are handled client-side by reconcileSnapshot().
 *
 * Order is preserved (the array is already chronological), so getNextPuzzle(),
 * which cycles by array index, keeps working unchanged.
 *
 * Usage:
 *   npm run prune-leksokipos-thin:dry    # report only, writes nothing
 *   npm run prune-leksokipos-thin        # rewrite puzzles-el.json
 *
 * After a real run, regenerate the slim index:
 *   npm run generate-puzzle-index
 */

import fs from "fs";
import path from "path";

import { LEKSOKIPOS } from "../src/config/gameRules";
import type { LeksokiposPuzzle } from "../src/games/leksokipos/types";
import { maxScore } from "../src/games/leksokipos/lib/scoring";
import { meetsScoreFloor } from "./lib/leksokipos/puzzleQuality";

const isDryRun = process.argv.includes("--dry-run");

const BOUNDARY = LEKSOKIPOS.SCORE_FLOOR_FROM;

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

// ── Split at the boundary ──────────────────────────────────────────────────────

const frozen = puzzles.filter((p) => p.date < BOUNDARY);
const future = puzzles.filter((p) => p.date >= BOUNDARY);

if (future.length === 0) {
  console.error(`❌  no puzzles on or after ${BOUNDARY} — nothing to prune.`);
  process.exit(1);
}

// A hole at the seam would be as invisible as any other missing day, so refuse
// to write unless the frozen tail runs right up to the boundary.
if (frozen.length > 0 && addDays(frozen[frozen.length - 1].date, 1) !== BOUNDARY) {
  console.error(
    `❌  frozen history ends ${frozen[frozen.length - 1].date}, which does not meet ${BOUNDARY}.`,
  );
  process.exit(1);
}

// ── Filter and reflow ──────────────────────────────────────────────────────────

const kept = future.filter(meetsScoreFloor);
const dropped = future.filter((p) => !meetsScoreFloor(p));

if (kept.length === 0) {
  console.error("❌  every future puzzle is under the floor — refusing to empty the corpus.");
  process.exit(1);
}

const reflowed = kept.map((puzzle, i) => {
  const date = addDays(BOUNDARY, i);
  return { ...puzzle, id: `${date}-${puzzle.language}`, date };
});

const corpus = [...frozen, ...reflowed];

// ── Report ─────────────────────────────────────────────────────────────────────

const belowFloorInHistory = frozen.filter((p) => !meetsScoreFloor(p)).length;
const lastDate = reflowed[reflowed.length - 1].date;
const runwayYears = (reflowed.length / 365).toFixed(2);

console.log(`${isDryRun ? "DRY RUN — no files written" : "PRUNING"}\n`);
console.log(`  floor: max score >= ${LEKSOKIPOS.MIN_MAX_SCORE}, applied from ${BOUNDARY} forward`);
console.log(`  (measured with SCORE_SCALE=${LEKSOKIPOS.SCORE_SCALE}, SOFT_CAP_KNEE=${LEKSOKIPOS.SOFT_CAP_KNEE}, SOFT_CAP_K=${LEKSOKIPOS.SOFT_CAP_K})\n`);
console.log(`  frozen history: ${frozen.length} puzzles, untouched`);
console.log(`    of which under the floor and deliberately kept: ${belowFloorInHistory}\n`);
console.log(`  from ${BOUNDARY}: ${future.length} puzzles`);
console.log(`    removed ${dropped.length}`);
console.log(`    kept    ${reflowed.length}\n`);
console.log(`  ${BOUNDARY} now serves max score ${maxScore(reflowed[0])} (was ${maxScore(future[0])})`);
console.log(`  dates reflow ${BOUNDARY} → ${lastDate}  (~${runwayYears} years of runway)`);
console.log(`  corpus total ${corpus.length} (was ${puzzles.length})\n`);

if (isDryRun) {
  console.log("Re-run without --dry-run to apply, then: npm run generate-puzzle-index");
  process.exit(0);
}

// ── Write ──────────────────────────────────────────────────────────────────────
// Pretty-printed (2-space) — match batch-generate.ts and the re-sync adapter.

fs.writeFileSync(puzzlePath, JSON.stringify(corpus, null, 2), "utf8");

console.log(`✓ wrote ${corpus.length} puzzles → ${puzzlePath}`);
console.log("→ now run: npm run generate-puzzle-index");
