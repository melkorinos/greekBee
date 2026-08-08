/**
 * generate-leksoplegma.ts
 *
 * Generates the committed Leksoplegma puzzle batch. Thin CLI around the pure
 * generator core in src/games/leksoplegma/lib/generator.ts — all constraints
 * (9 required words, full tile coverage, 8-dir adjacency, no crossing
 * diagonals, offline bonus enumeration) live and are tested there.
 *
 * Required words come from Leksiarxeio's curated answer pools (read-only
 * reuse); bonus words are enumerated against the full words-el.json, which
 * never ships to the client.
 *
 * Deterministic for a given --seed: re-running reproduces the same batch.
 *
 * Usage:
 *   npm run generate-leksoplegma
 *   npm run generate-leksoplegma -- --count=200 --seed=leksoplegma-v1
 */

import fs from "fs";
import path from "path";

import { hashSeed, mulberry32 } from "../src/games/leksodromia/lib/seededRandom";
import {
  generatePuzzle,
  validatePuzzle,
  type LeksoplegmaGenPools,
} from "../src/games/leksoplegma/lib/generator";
import type { LeksoplegmaPuzzle } from "../src/games/leksoplegma/types";

// ── CLI args ──────────────────────────────────────────────────────────────────

function getArg(name: string, fallback: string): string {
  const flag = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(flag));
  return arg ? arg.slice(flag.length) : fallback;
}

const COUNT = parseInt(getArg("count", "200"), 10);
const SEED = getArg("seed", "leksoplegma-v1");

// ── Load data ─────────────────────────────────────────────────────────────────

const dataDir = path.join(__dirname, "..", "src", "data");

function loadJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf-8")) as T;
}

const pools: LeksoplegmaGenPools = {
  4: loadJson<string[]>("leksiarxeio/answers-4.json"),
  5: loadJson<string[]>("leksiarxeio/answers-5.json"),
  6: loadJson<string[]>("leksiarxeio/answers-6.json"),
  7: loadJson<string[]>("leksiarxeio/answers-7.json"),
  8: loadJson<string[]>("leksiarxeio/answers-8.json"),
};

console.log(`Loading dictionary…`);
const dict = loadJson<string[]>("words-el.json");
console.log(`  ${dict.length} words`);

// ── Generate ──────────────────────────────────────────────────────────────────

const rand = mulberry32(hashSeed(SEED));
const puzzles: LeksoplegmaPuzzle[] = [];
const started = Date.now();

for (let i = 0; i < COUNT; i++) {
  const id = `leksoplegma-${String(i + 1).padStart(3, "0")}`;
  const puzzle = generatePuzzle({ id, rand, pools, dict });
  if (!puzzle) {
    console.error(`✗ ${id}: generation exhausted all attempts — aborting`);
    process.exit(1);
  }
  const violations = validatePuzzle(puzzle);
  if (violations.length > 0) {
    console.error(`✗ ${id}: ${violations.join("; ")}`);
    process.exit(1);
  }
  puzzles.push(puzzle);
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${COUNT}…`);
}

// ── Write + stats ─────────────────────────────────────────────────────────────

const outFile = path.join(dataDir, "leksoplegma", "puzzles-el.json");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(puzzles), "utf-8");

const bonusCounts = puzzles.map((p) => p.bonusWords.length);
const avgBonus = bonusCounts.reduce((a, b) => a + b, 0) / puzzles.length;
const requiredLetters = puzzles.map((p) =>
  Object.keys(p.paths).reduce((sum, w) => sum + w.length, 0),
);
const avgLetters = requiredLetters.reduce((a, b) => a + b, 0) / puzzles.length;
const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1);

console.log(`\n✓ ${puzzles.length} puzzles → ${outFile} (${sizeKb} KB)`);
console.log(`  avg required letters/puzzle: ${avgLetters.toFixed(1)} (base score ×10)`);
console.log(`  bonus words/puzzle: min ${Math.min(...bonusCounts)}, avg ${avgBonus.toFixed(1)}, max ${Math.max(...bonusCounts)}`);
console.log(`  took ${((Date.now() - started) / 1000).toFixed(1)}s`);
