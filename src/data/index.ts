// Puzzle data access layer.
// Loads puzzle definitions from the local JSON files.

import type { Language, Puzzle } from "@/types";

import greekPuzzles from "./puzzles-el.json";

// Cast the imported JSON to the typed Puzzle array.
// TypeScript will warn us if the JSON shape ever drifts from the Puzzle interface.
const PUZZLES: Record<Language, Puzzle[]> = {
  el: greekPuzzles as Puzzle[],
};

/**
 * Returns the puzzle for a given date and language.
 * Falls back to the most recent available puzzle if no match is found.
 */
export function getPuzzleForDate(date: string, language: Language = "el"): Puzzle {
  const puzzles = PUZZLES[language];

  if (puzzles.length === 0) {
    throw new Error(`No puzzles available for language: ${language}`);
  }

  const match = puzzles.find((p) => p.date === date);

  // Fall back to the last puzzle in the list (most recent)
  return match ?? puzzles[puzzles.length - 1];
}

/**
 * Returns today's puzzle using the current date in ISO format (YYYY-MM-DD).
 */
export function getTodaysPuzzle(language: Language = "el"): Puzzle {
  const today = new Date().toISOString().split("T")[0];
  return getPuzzleForDate(today, language);
}

/**
 * Returns a puzzle by its unique ID, or null if not found.
 */
export function getPuzzleById(id: string, language: Language): Puzzle | null {
  return PUZZLES[language].find((p) => p.id === id) ?? null;
}

/**
 * Returns a random puzzle for the given language, optionally excluding one by ID.
 * Used for the "Random Puzzle" feature.
 */
export function getRandomPuzzle(language: Language, excludeId?: string): Puzzle {
  const list = PUZZLES[language];
  const candidates = excludeId ? list.filter((p) => p.id !== excludeId) : list;
  const pool = candidates.length > 0 ? candidates : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Returns the puzzle after the given one in the list.
 * Cycles back to the first puzzle when the last one is reached.
 * Used to build the "Next Puzzle" URL server-side.
 */
export function getNextPuzzle(current: Puzzle): Puzzle {
  const list = PUZZLES[current.language as Language];
  const idx = list.findIndex((p) => p.id === current.id);
  const nextIdx = idx >= 0 ? (idx + 1) % list.length : 0;
  return list[nextIdx];
}
