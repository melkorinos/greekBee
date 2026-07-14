// Leksoplegma — data loader (runs server-side via Next.js App Router).
// Daily puzzle = dateToIndex rotation over the committed generator batch,
// advanced past any puzzle whose REQUIRED words contain one of Leksiarxeio's
// same-day fallback answers (the recap reveals all required words, so serving
// one would leak another game's daily answer — same invariant Leksodromia
// enforces, but at rotation time since generation isn't date-coupled).
//
// The answers-*.json pools are imported DIRECTLY (≈300 KB total) — never via
// @/data/leksiarxeio, whose module graph statically imports the MB-scale
// words-*.json guess lists (Fluid CPU: this route must not parse those on
// cold start). Bonus words are precomputed in the puzzle JSON; words-el.json
// is nowhere near this game at runtime.

import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";
import { dateToIndex } from "@/lib/puzzleRotation";

import puzzlesJson from "./puzzles-el.json";

import answers4 from "../leksiarxeio/answers-4.json";
import answers5 from "../leksiarxeio/answers-5.json";
import answers6 from "../leksiarxeio/answers-6.json";
import answers7 from "../leksiarxeio/answers-7.json";
import answers8 from "../leksiarxeio/answers-8.json";

// Two-step cast: tsc infers `paths` as a union of exact per-puzzle key sets
// (every Greek word key, optional everywhere), which never overlaps with
// Record<string, number[]>. The generator's validatePuzzle guarantees the shape.
const PUZZLES = puzzlesJson as unknown as LeksoplegmaPuzzle[];

const LEKSIARXEIO_POOLS: readonly (readonly string[])[] = [
  answers4 as string[],
  answers5 as string[],
  answers6 as string[],
  answers7 as string[],
  answers8 as string[],
];

/**
 * True when any of `puzzle`'s required words is Leksiarxeio's static fallback
 * answer (pool[dateToIndex]) for the same date, at any length.
 */
export function containsSameDayLeksiarxeioAnswer(
  puzzle: LeksoplegmaPuzzle,
  date: string,
): boolean {
  return LEKSIARXEIO_POOLS.some(
    (pool) => pool[dateToIndex(date, pool.length)] in puzzle.paths,
  );
}

/** The daily Leksoplegma puzzle for `date` — pure, no I/O beyond static data. */
export function getPuzzleForDate(date: string): LeksoplegmaPuzzle {
  const base = dateToIndex(date, PUZZLES.length);
  for (let hops = 0; hops < PUZZLES.length; hops++) {
    const puzzle = PUZZLES[(base + hops) % PUZZLES.length];
    if (!containsSameDayLeksiarxeioAnswer(puzzle, date)) return puzzle;
  }
  return PUZZLES[base]; // unreachable: a batch where every puzzle collides
}

/** Returns today's ISO date string (YYYY-MM-DD) using the server clock. */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
