// Leksoplegma — data loader (runs server-side via Next.js App Router).
// Daily puzzle = dateToIndex rotation over the committed generator batch,
// advanced past any puzzle whose REQUIRED words contain one of Leksiarxeio's
// same-day fallback answers (the recap reveals all required words, so serving
// one would leak another game's daily answer — same invariant Leksodromia
// enforces, but at rotation time since generation isn't date-coupled).
//
// The same-day answer set comes from @/data/leksiarxeio/answerPools — the
// Fluid-safe module that imports only answers-*.json, never the MB-scale
// words-*.json guess lists (Fluid CPU: this route must not parse those on cold
// start). Bonus words are precomputed in the puzzle JSON; words-el.json is
// nowhere near this game at runtime.

import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";
import { dateToIndex } from "@/lib/puzzleRotation";
import { getSameDayFallbackAnswers } from "@/data/leksiarxeio/answerPools";

import puzzlesJson from "./puzzles-el.json";

// Two-step cast: tsc infers `paths` as a union of exact per-puzzle key sets
// (every Greek word key, optional everywhere), which never overlaps with
// Record<string, number[]>. The generator's validatePuzzle guarantees the shape.
const PUZZLES = puzzlesJson as unknown as LeksoplegmaPuzzle[];

/**
 * True when any of `puzzle`'s required words is one of Leksiarxeio's same-day
 * fallback answers, at any length.
 */
export function containsSameDayLeksiarxeioAnswer(
  puzzle: LeksoplegmaPuzzle,
  date: string,
): boolean {
  for (const answer of getSameDayFallbackAnswers(date)) {
    if (answer in puzzle.paths) return true;
  }
  return false;
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

/** Today's ISO date string (YYYY-MM-DD). Re-exported from `@/lib/puzzleDate`. */
export { todayISO as getTodayDateString } from "@/lib/puzzleDate";
