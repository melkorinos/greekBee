// Data loader for Leksindeseis puzzles.
// Finds today's puzzle by date; falls back to the most recent if no match.

import type { LeksindeseisPuzzle } from "@/games/leksindeseis/types";
import puzzles from "./puzzles-connections.json";

const ALL_PUZZLES = puzzles as LeksindeseisPuzzle[];

/**
 * Return today's puzzle (matched by "YYYY-MM-DD").
 * Falls back to the last puzzle in the array if no match is found.
 */
export function getTodaysLeksindeseisPuzzle(today: string): LeksindeseisPuzzle {
  const match = ALL_PUZZLES.find((p) => p.date === today);
  if (match) return match;
  // Fallback: most recent puzzle (last in array)
  return ALL_PUZZLES[ALL_PUZZLES.length - 1];
}

export { ALL_PUZZLES as allLeksindeseisPuzzles };
