// Leksoplegma — offline puzzle generator core (pure functions, no I/O).
// Runs only at build time via scripts/generate-leksoplegma.ts — the 795k-word
// dictionary is injected here and NEVER ships to the client (bonus words are
// precomputed into the puzzle JSON, same reasoning that made Leksodromia
// exact-match). Nothing in the runtime game imports this module.
//
// Board construction: place required words one at a time on the 4×4 grid via
// randomised DFS. A tile is compatible with a letter if it is still unassigned
// (free) or already holds that letter — overlap is what compresses ~46 letter
// visits into 16 tiles. A whole-board attempt fails (and is re-rolled) if any
// word slot can't be placed or the finished board leaves a tile uncovered.

import { LEKSOPLEGMA } from "@/config/gameRules";

import type { LeksoplegmaPuzzle } from "../types";

import { edgeKey, edgesOf } from "./graph";

// ─── Geometry (4×4, 8-dir adjacency) ─────────────────────────────────────────

const SIZE = Math.sqrt(LEKSOPLEGMA.GRID_SIZE); // 4

/** True when tiles a and b are 8-dir neighbours on the 4×4 grid. */
export function areAdjacent(a: number, b: number): boolean {
  if (a === b) return false;
  const dr = Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE));
  const dc = Math.abs((a % SIZE) - (b % SIZE));
  return dr <= 1 && dc <= 1;
}

/**
 * For a diagonal edge a-b, the edge that would visually cross it (the other
 * diagonal of the same unit cell); null for horizontal/vertical edges.
 */
function crossingEdge(a: number, b: number): string | null {
  const [r1, c1] = [Math.floor(a / SIZE), a % SIZE];
  const [r2, c2] = [Math.floor(b / SIZE), b % SIZE];
  if (Math.abs(r1 - r2) !== 1 || Math.abs(c1 - c2) !== 1) return null;
  return edgeKey(r1 * SIZE + c2, r2 * SIZE + c1);
}

// ─── Generation tuning (offline-only knobs — not gameplay config) ─────────────

/** Bonus words shorter than this are noise (particles, exclamations). */
export const BONUS_MIN_LENGTH = 3;

const TRIES_PER_SLOT   = 400;  // candidate words tried per required-word slot
const DFS_BUDGET       = 4000; // node expansions per word placement
const BOARD_ATTEMPTS   = 400;  // whole-board re-rolls before giving up

export type LeksoplegmaGenPools = Record<4 | 5 | 6 | 7 | 8, readonly string[]>;

// ─── Random helpers (caller supplies the seeded PRNG) ─────────────────────────

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The 9 required-word lengths: one long anchor (7 or 8) + a guaranteed 4/5/6
 * mix + two random short fillers. Descending order — long words go first while
 * the board is mostly free.
 */
function pickLengths(rand: () => number): (4 | 5 | 6 | 7 | 8)[] {
  const short: (4 | 5 | 6)[] = [4, 5, 6];
  const lengths: (4 | 5 | 6 | 7 | 8)[] = [
    rand() < 0.5 ? 7 : 8,
    4, 4, 4, 5, 5, 6,
    short[Math.floor(rand() * short.length)],
    short[Math.floor(rand() * short.length)],
  ];
  return lengths.sort((a, b) => b - a).slice(0, LEKSOPLEGMA.REQUIRED_WORDS);
}

// ─── Word placement ───────────────────────────────────────────────────────────

/**
 * Find a path spelling `word` on the partial board: distinct 8-dir-adjacent
 * tiles, each free or already holding the needed letter, never completing a
 * crossing-diagonal pair against existing edges or the path so far.
 */
function findPath(
  word: string,
  letters: (string | null)[],
  edges: ReadonlySet<string>,
  rand: () => number,
): number[] | null {
  let budget = DFS_BUDGET;
  const allTiles = Array.from({ length: LEKSOPLEGMA.GRID_SIZE }, (_, i) => i);

  function compatible(tile: number, letter: string): boolean {
    return letters[tile] === null || letters[tile] === letter;
  }

  function dfs(path: number[], pathEdges: Set<string>): number[] | null {
    if (path.length === word.length) return path;
    if (budget-- <= 0) return null;
    const prev = path[path.length - 1];
    const next = word[path.length];
    for (const tile of shuffled(allTiles, rand)) {
      if (path.includes(tile) || !areAdjacent(prev, tile) || !compatible(tile, next)) continue;
      const key = edgeKey(prev, tile);
      const cross = crossingEdge(prev, tile);
      if (cross !== null && (edges.has(cross) || pathEdges.has(cross))) continue;
      pathEdges.add(key);
      const found = dfs([...path, tile], pathEdges);
      if (found) return found;
      pathEdges.delete(key);
    }
    return null;
  }

  for (const start of shuffled(allTiles, rand)) {
    if (!compatible(start, word[0])) continue;
    const found = dfs([start], new Set());
    if (found) return found;
    if (budget <= 0) return null;
  }
  return null;
}

/** One whole-board attempt: place all 9 words, then require full tile coverage. */
function attemptBoard(
  rand: () => number,
  pools: LeksoplegmaGenPools,
): { letters: string; paths: Record<string, number[]> } | null {
  const letters: (string | null)[] = Array(LEKSOPLEGMA.GRID_SIZE).fill(null);
  const edges = new Set<string>();
  const paths: Record<string, number[]> = {};

  for (const length of pickLengths(rand)) {
    const pool = pools[length];
    let placed = false;
    for (const word of shuffled(pool, rand).slice(0, TRIES_PER_SLOT)) {
      if (word in paths || word.length !== length) continue;
      const path = findPath(word, letters, edges, rand);
      if (!path) continue;
      path.forEach((tile, i) => { letters[tile] = word[i]; });
      for (let i = 1; i < path.length; i++) edges.add(edgeKey(path[i - 1], path[i]));
      paths[word] = path;
      placed = true;
      break;
    }
    if (!placed) return null;
  }

  if (letters.some((l) => l === null)) return null; // coverage: board must end empty
  return { letters: letters.join(""), paths };
}

// ─── Bonus enumeration ────────────────────────────────────────────────────────

/** True when `word` can be traced along `edges` on this board (distinct tiles). */
export function canTrace(
  word: string,
  letters: string,
  edges: ReadonlySet<string>,
): boolean {
  if (word.length < 2 || word.length > letters.length) return false;

  function dfs(pos: number, tile: number, used: Set<number>): boolean {
    if (pos === word.length) return true;
    for (let next = 0; next < letters.length; next++) {
      if (used.has(next) || letters[next] !== word[pos]) continue;
      if (!edges.has(edgeKey(tile, next))) continue;
      used.add(next);
      if (dfs(pos + 1, next, used)) return true;
      used.delete(next);
    }
    return false;
  }

  for (let start = 0; start < letters.length; start++) {
    if (letters[start] !== word[0]) continue;
    if (dfs(1, start, new Set([start]))) return true;
  }
  return false;
}

/**
 * All dictionary words traceable along the required-edge graph, minus the
 * required words themselves. Prefix-pruned DFS so the 795k dictionary stays
 * cheap: only words spelled from board letters even become candidates.
 */
export function enumerateBonusWords(
  letters: string,
  paths: Record<string, readonly number[]>,
  dict: readonly string[],
): string[] {
  const boardChars = new Set(letters);
  const required = new Set(Object.keys(paths));
  const candidates = new Set(
    dict.filter(
      (w) =>
        w.length >= BONUS_MIN_LENGTH &&
        w.length <= letters.length &&
        !required.has(w) &&
        [...w].every((ch) => boardChars.has(ch)),
    ),
  );

  const prefixes = new Set<string>();
  for (const word of candidates) {
    for (let i = 1; i <= word.length; i++) prefixes.add(word.slice(0, i));
  }

  // Adjacency list from the edge union.
  const edges = edgesOf(paths);
  const neighbors: number[][] = Array.from({ length: letters.length }, () => []);
  for (const key of edges) {
    const [a, b] = key.split("-").map(Number);
    neighbors[a].push(b);
    neighbors[b].push(a);
  }

  const found = new Set<string>();
  function dfs(tile: number, word: string, used: Set<number>) {
    if (!prefixes.has(word)) return;
    if (candidates.has(word)) found.add(word);
    for (const next of neighbors[tile]) {
      if (used.has(next)) continue;
      used.add(next);
      dfs(next, word + letters[next], used);
      used.delete(next);
    }
  }
  for (let tile = 0; tile < letters.length; tile++) {
    dfs(tile, letters[tile], new Set([tile]));
  }

  return [...found].sort();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GeneratePuzzleOptions {
  id:    string;
  rand:  () => number;
  pools: LeksoplegmaGenPools;
  dict:  readonly string[];
}

/** Generate one quality-gated puzzle, or null if no attempt satisfied the constraints. */
export function generatePuzzle(opts: GeneratePuzzleOptions): LeksoplegmaPuzzle | null {
  for (let attempt = 0; attempt < BOARD_ATTEMPTS; attempt++) {
    const board = attemptBoard(opts.rand, opts.pools);
    if (!board) continue;
    return {
      id:         opts.id,
      letters:    board.letters,
      paths:      board.paths,
      bonusWords: enumerateBonusWords(board.letters, board.paths, opts.dict),
    };
  }
  return null;
}

/** Every constraint violation in `puzzle` — [] means the board is sound. */
export function validatePuzzle(puzzle: LeksoplegmaPuzzle): string[] {
  const violations: string[] = [];
  const words = Object.keys(puzzle.paths);

  if (puzzle.letters.length !== LEKSOPLEGMA.GRID_SIZE) {
    violations.push(`letters length ${puzzle.letters.length} ≠ ${LEKSOPLEGMA.GRID_SIZE}`);
  }
  if (!/^[α-ω]+$/u.test(puzzle.letters)) {
    violations.push("letters must be accent-free lowercase Greek");
  }
  if (words.length !== LEKSOPLEGMA.REQUIRED_WORDS) {
    violations.push(`${words.length} required words ≠ ${LEKSOPLEGMA.REQUIRED_WORDS}`);
  }
  if (!words.some((w) => w.length >= 7)) {
    violations.push("no long anchor word (7–8 letters)");
  }

  for (const [word, path] of Object.entries(puzzle.paths)) {
    if (path.length !== word.length) violations.push(`${word}: path length mismatch`);
    if (new Set(path).size !== path.length) violations.push(`${word}: repeated tile in path`);
    path.forEach((tile, i) => {
      if (puzzle.letters[tile] !== word[i]) violations.push(`${word}: letter mismatch at step ${i}`);
      if (i > 0 && !areAdjacent(path[i - 1], tile)) violations.push(`${word}: non-adjacent step ${i}`);
    });
  }

  const covered = new Set(Object.values(puzzle.paths).flat());
  if (covered.size !== LEKSOPLEGMA.GRID_SIZE) {
    violations.push(`only ${covered.size}/${LEKSOPLEGMA.GRID_SIZE} tiles covered`);
  }

  const edges = edgesOf(puzzle.paths);
  for (const key of edges) {
    const [a, b] = key.split("-").map(Number);
    const cross = crossingEdge(a, b);
    if (cross !== null && edges.has(cross)) violations.push(`crossing diagonals ${key} × ${cross}`);
  }

  for (const bonus of puzzle.bonusWords) {
    if (bonus in puzzle.paths) violations.push(`bonus ${bonus} is also required`);
    if (!canTrace(bonus, puzzle.letters, edges)) violations.push(`bonus ${bonus} not traceable`);
  }

  return violations;
}
