// Data loader for Connections puzzles.
// Finds today's puzzle by date; falls back to the most recent if no match.

import type { ConnectionsPuzzle } from "@/games/connections/types";
import puzzles from "./puzzles-connections.json";

const ALL_PUZZLES = puzzles as ConnectionsPuzzle[];

/**
 * Return today's puzzle (matched by "YYYY-MM-DD").
 * Falls back to the last puzzle in the array if no match is found.
 */
export function getTodaysConnectionsPuzzle(today: string): ConnectionsPuzzle {
  const match = ALL_PUZZLES.find((p) => p.date === today);
  if (match) return match;
  // Fallback: most recent puzzle (last in array)
  return ALL_PUZZLES[ALL_PUZZLES.length - 1];
}

export { ALL_PUZZLES as allConnectionsPuzzles };
