// Wordle GR — data loader (runs server-side via Next.js App Router).
// Picks today's answer deterministically by date so every user gets the same word.
//
// One list per length (words-N.json) is used for both the answer pool and
// valid-guess validation.  No separate curated list — word quality will be
// addressed later (see .claude/issue-tracker/issues/05-td003-wordle-answer-pool.md).

import type { WordleLength, WordlePuzzle } from "@/games/wordle/types";

import words4 from "./words-4.json";
import words5 from "./words-5.json";
import words6 from "./words-6.json";
import words7 from "./words-7.json";
import words8 from "./words-8.json";

export const WORDLE_LENGTHS: WordleLength[] = [4, 5, 6, 7, 8];

/** Single word list per length — same list drives answers AND valid guesses */
const WORD_LISTS: Record<WordleLength, string[]> = {
  3: [],               // unsupported — kept for type completeness
  4: words4 as string[],
  5: words5 as string[],
  6: words6 as string[],
  7: words7 as string[],
  8: words8 as string[],
};

/**
 * Returns a stable index for a given ISO date string (YYYY-MM-DD).
 * The index cycles through the word list so every day has a different word.
 */
function dateToIndex(dateStr: string, listLength: number): number {
  // Use the epoch day count for simple, stable, timezone-agnostic rotation
  const epoch = new Date("2025-01-01").getTime();
  const target = new Date(dateStr).getTime();
  const dayOffset = Math.floor((target - epoch) / 86_400_000);
  return ((dayOffset % listLength) + listLength) % listLength;
}

/**
 * Returns today's Wordle puzzle for the given word length.
 * `date` should be an ISO date string (YYYY-MM-DD) — pass from the server so
 * all users share the same puzzle regardless of their local timezone.
 */
export function getTodaysWordlePuzzle(
  date: string,
  length: WordleLength = 4
): WordlePuzzle {
  const pool = WORD_LISTS[length];
  if (!pool || pool.length === 0) {
    throw new Error(`No word list available for length ${length}`);
  }

  const idx    = dateToIndex(date, pool.length);
  const answer = pool[idx];

  return {
    id:     `${date}-wordle-${length}`,
    date,
    answer,
    length,
  };
}

/**
 * Returns all 5 daily puzzles (lengths 4–8) for a given date.
 */
export function getAllTodaysWordlePuzzles(date: string): WordlePuzzle[] {
  return WORDLE_LENGTHS.map((l) => getTodaysWordlePuzzle(date, l));
}

/**
 * Returns the word list for a given length — used for both answer selection
 * and client-side guess validation.
 */
export function getValidWords(length: WordleLength = 4): string[] {
  return WORD_LISTS[length] ?? [];
}

/** Returns today's ISO date string (YYYY-MM-DD) using the server clock */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
