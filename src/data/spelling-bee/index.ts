// Spelling Bee puzzle data access layer.
// Loads puzzle definitions from the local JSON file.
// Also exposes buildCustomPuzzle() for the dynamic /spelling-bee/[center]/[outer] route.

import type { Language } from "@/types";
import type { SpellingBeePuzzle } from "@/games/spelling-bee/types";
import { computeValidWords } from "@/games/spelling-bee/lib/computeValidWords";
import greekPuzzles from "./puzzles-el.json";
import { normalizeLetters } from "@/games/spelling-bee/lib/normalize";
import wordListEl from "../words-el.json";

// Cast the imported JSON to the typed Puzzle array.
// TypeScript will warn us if the JSON shape ever drifts from the Puzzle interface.
const PUZZLES: Record<Language, SpellingBeePuzzle[]> = {
  el: greekPuzzles as SpellingBeePuzzle[],
};

/**
 * Returns the puzzle for a given date and language.
 * Falls back to the most recent available puzzle if no match is found.
 */
export function getPuzzleForDate(date: string, language: Language = "el"): SpellingBeePuzzle {
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
export function getTodaysPuzzle(language: Language = "el"): SpellingBeePuzzle {
  const today = new Date().toISOString().split("T")[0];
  return getPuzzleForDate(today, language);
}

/**
 * Returns a puzzle by its unique ID, or null if not found.
 */
export function getPuzzleById(id: string, language: Language): SpellingBeePuzzle | null {
  return PUZZLES[language].find((p) => p.id === id) ?? null;
}

/**
 * Returns a random puzzle for the given language, optionally excluding one by ID.
 * Used for the "Random Puzzle" feature.
 */
export function getRandomPuzzle(language: Language, excludeId?: string): SpellingBeePuzzle {
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
export function getNextPuzzle(current: SpellingBeePuzzle): SpellingBeePuzzle {
  const list = PUZZLES[current.language as Language];
  const idx = list.findIndex((p) => p.id === current.id);
  const nextIdx = idx >= 0 ? (idx + 1) % list.length : 0;
  return list[nextIdx];
}

/**
 * Looks up a pre-built puzzle by its letter combination (center + outer set).
 * Returns the pre-built puzzle if found, null otherwise.
 * Used by the [center]/[outer] page to detect when a URL matches a daily puzzle
 * so the real puzzle ID (e.g. "2026-05-18-el") reaches GameBoard instead of
 * the synthetic "custom-..." ID — which enables the leaderboard.
 */
export function getPrebuiltPuzzleByLetters(
  center: string,
  outer: string[],
  language: Language = "el"
): SpellingBeePuzzle | null {
  const normalizedCenter = normalizeLetters(center);
  const normalizedOuter  = [...outer.map(normalizeLetters)].sort().join("");
  return (
    PUZZLES[language].find((p) => {
      const pOuter = [...p.outerLetters.map(normalizeLetters)].sort().join("");
      return (
        normalizeLetters(p.centerLetter) === normalizedCenter &&
        pOuter === normalizedOuter
      );
    }) ?? null
  );
}

/**
 * Returns the most recent `n` puzzle dates (YYYY-MM-DD), up to and including
 * today, sorted newest-first.
 *
 * Used by the leaderboard to build the rolling 7-day strip instead of a
 * free-form date picker.
 */
export function getRecentPuzzleDates(n: number, language: Language = "el"): string[] {
  const today = new Date().toISOString().split("T")[0];
  const past = PUZZLES[language].filter((p) => p.date <= today);
  return past
    .slice(-n)
    .map((p) => p.date)
    .reverse(); // newest-first: [today, yesterday, …]
}

/**
 * Builds a fully playable Puzzle from an arbitrary 7-letter combination by
 * computing the valid word list on the fly from the full word list.
 *
 * The puzzle ID is derived from the normalised letters only (not the date) so
 * that the same URL always maps to the same localStorage persistence key —
 * progress persists across refreshes for as long as the player keeps using the
 * same URL.
 *
 * The `date` field is set to today so the UI displays something sensible, but
 * it plays no role in word-validity logic.
 *
 * ── Performance note ────────────────────────────────────────────────────────
 * `computeValidWords` linearly scans the full 811 k-word Greek dictionary
 * (~50–200 ms on a cold Vercel Fluid instance).  That scan is billed as Fluid
 * Active CPU, which is the app's most constrained usage tier.
 *
 * Two layers of caching protect against this:
 *   1. Module-level `validWordsCache` Map (below): warm Fluid instances serving
 *      the same letter combo pay zero CPU on repeat requests.
 *   2. `export const revalidate = 3600` on the [center]/[outer] page: the full
 *      Server Component HTML is cached at the Vercel CDN edge for 1 hour, so
 *      the Fluid function is only invoked once per unique combo per hour.
 */

// Module-level cache: keyed by `custom-{center}-{sortedOuter}` (canonical ID).
// Declared at module scope so it survives across requests within the same Fluid
// process lifetime.  Vercel Fluid is NOT serverless-per-request — warm instances
// handle many requests before being recycled, making this pattern effective.
// Do NOT use React.cache() or unstable_cache() here: this function is called
// synchronously from a Server Component and those APIs return Promises.
const validWordsCache = new Map<string, string[]>();

export function buildCustomPuzzle(
  centerLetter: string,
  outerLetters: string[],
  language: Language = "el"
): SpellingBeePuzzle {
  const center = normalizeLetters(centerLetter);
  const outer = outerLetters.map(normalizeLetters);

  // Stable canonical ID regardless of outer-letter order in the URL
  const sortedOuter = [...outer].sort().join("");
  const id = `custom-${center}-${sortedOuter}`;

  const today = new Date().toISOString().split("T")[0];

  const wordList: string[] =
    language === "el" ? (wordListEl as string[]) : [];

  // Cache key = canonical puzzle ID (letters only, order-independent).
  // The same key is used for localStorage persistence so the cache can never
  // serve stale words for a given URL.
  let validWords = validWordsCache.get(id);
  if (!validWords) {
    // Cold path: scan the full word list.  ~50–200 ms on production hardware.
    // Subsequent calls for the same combo skip this entirely.
    validWords = computeValidWords(center, outer, wordList);
    validWordsCache.set(id, validWords);
  }

  return {
    id,
    language,
    centerLetter: center,
    outerLetters: outer,
    validWords,
    date: today,
  };
}
