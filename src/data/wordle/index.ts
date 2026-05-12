// Wordle GR — data loader (runs server-side via Next.js App Router).
// Picks today's answer deterministically by date so every user gets the same word.
//
// Two separate lists:
//   answers-5.json — curated ~3.8k everyday words; used for the daily answer
//   words-5.json   — full 9.5k valid-guess list; used for guess validation

import type { WordleLength, WordlePuzzle } from "@/games/wordle/types";

import answers5 from "./answers-5.json";
import words5   from "./words-5.json";

/** Answer pools, keyed by word length — only common everyday words */
const ANSWER_POOLS: Partial<Record<WordleLength, string[]>> = {
  5: answers5 as string[],
};

/** Full valid-guess lists, keyed by word length */
const WORD_LISTS: Partial<Record<WordleLength, string[]>> = {
  5: words5 as string[],
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
  length: WordleLength = 5
): WordlePuzzle {
  const pool = ANSWER_POOLS[length];
  if (!pool || pool.length === 0) {
    throw new Error(`No answer pool available for length ${length}`);
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
 * Returns the curated answer pool for a given length.
 * This is a subset of the full word list — everyday words only.
 */
export function getAnswerPool(length: WordleLength = 5): string[] {
  return ANSWER_POOLS[length] ?? [];
}

/**
 * Returns the full valid-words list for a given length.
 * Used for guess validation on the client — wider than the answer pool.
 */
export function getValidWords(length: WordleLength = 5): string[] {
  return WORD_LISTS[length] ?? [];
}

/** Returns today's ISO date string (YYYY-MM-DD) using the server clock */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
