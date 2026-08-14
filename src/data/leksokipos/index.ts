// Leksokipos puzzle data access layer.
// Loads puzzle definitions from the local JSON file.
// Also exposes buildCustomPuzzle() for the dynamic /leksokipos/[center]/[outer] route.

import type { Language } from "@/types";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { computeValidWords } from "@/games/leksokipos/lib/computeValidWords";
import greekPuzzles from "./puzzles-el.json";
import { normalizeLetters } from "@/lib/normalize";
import { todayISO } from "@/lib/puzzleDate";
import { pickByDateOrRotate } from "@/lib/puzzleRotation";

// Cast the imported JSON to the typed Puzzle array.
// TypeScript will warn us if the JSON shape ever drifts from the Puzzle interface.
const PUZZLES: Record<Language, LeksokiposPuzzle[]> = {
  el: greekPuzzles as LeksokiposPuzzle[],
};

/**
 * Returns the puzzle for a given date and language.
 * A date the calendar does not cover gets a deterministic rotation over the
 * boards already due — never the last board, which is the furthest-future one
 * (see pickByDateOrRotate for why that fallback was wrong).
 */
export function getPuzzleForDate(date: string, language: Language = "el"): LeksokiposPuzzle {
  const puzzles = PUZZLES[language];

  if (puzzles.length === 0) {
    throw new Error(`No puzzles available for language: ${language}`);
  }

  return pickByDateOrRotate(date, puzzles);
}

/**
 * Returns today's puzzle using the current date in ISO format (YYYY-MM-DD).
 */
export function getTodaysPuzzle(language: Language = "el"): LeksokiposPuzzle {
  return getPuzzleForDate(todayISO(), language);
}

/**
 * Returns a puzzle by its unique ID, or null if not found.
 */
export function getPuzzleById(id: string, language: Language): LeksokiposPuzzle | null {
  return PUZZLES[language].find((p) => p.id === id) ?? null;
}

/**
 * Returns a random puzzle for the given language, optionally excluding one by ID.
 * Used for the "Random Puzzle" feature.
 */
export function getRandomPuzzle(language: Language, excludeId?: string): LeksokiposPuzzle {
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
export function getNextPuzzle(current: LeksokiposPuzzle): LeksokiposPuzzle {
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
): LeksokiposPuzzle | null {
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
 * Builds a fully playable Puzzle from an arbitrary 7-letter combination by
 * computing the valid word list on the fly from the full word list.
 *
 * The puzzle ID is derived from the normalised letters only (not the date) so
 * that the same URL always maps to the same localStorage persistence key —
 * progress persists across refreshes for as long as the player keeps using the
 * same URL.
 *
 * The `date` field is empty: a custom puzzle is not date-bound. It cannot be
 * set from the clock here — this function runs behind `revalidate` on the
 * [center]/[outer] route, so any "today" it computed would be frozen into the
 * CDN-cached HTML and served stale for up to a week. Every reader of `date`
 * (score submission, achievement sync, state sync, useDayChange) is gated on
 * `isDailyPuzzle`, which keys off the `custom-` id prefix rather than the date.
 *
 * ── Performance note ────────────────────────────────────────────────────────
 * `computeValidWords` linearly scans the full 811 k-word Greek dictionary
 * (~50–200 ms on a cold Vercel Fluid instance).  That scan is billed as Fluid
 * Active CPU, which is the app's most constrained usage tier.
 *
 * Three layers of protection:
 *   1. words-el.json (19.5 MB) is loaded via dynamic import() below, only on
 *      the cache-miss path.  A static import here would make every consumer of
 *      this module (daily pages, prebuilt lookups) parse 19.5 MB of JSON on
 *      every cold start — measured at ~1.4 s billed CPU per invocation on the
 *      [center]/[outer] route.  Daily renders now parse only puzzles-el.json.
 *      The deploymentReadiness.test.ts "Fluid CPU guard" enforces this.
 *   2. Module-level `validWordsCache` Map (below): warm Fluid instances serving
 *      the same letter combo pay zero CPU on repeat requests.
 *   3. `export const revalidate = 604800` on the [center]/[outer] page: the
 *      full Server Component HTML is cached at the Vercel CDN edge for a week,
 *      so the Fluid function only runs for the first visitor per combo per week.
 */

// Module-level cache: keyed by `custom-{center}-{sortedOuter}` (canonical ID).
// Declared at module scope so it survives across requests within the same Fluid
// process lifetime.  Vercel Fluid is NOT serverless-per-request — warm instances
// handle many requests before being recycled, making this pattern effective.
const validWordsCache = new Map<string, string[]>();

export async function buildCustomPuzzle(
  centerLetter: string,
  outerLetters: string[],
  language: Language = "el"
): Promise<LeksokiposPuzzle> {
  const center = normalizeLetters(centerLetter);
  const outer = outerLetters.map(normalizeLetters);

  // Stable canonical ID regardless of outer-letter order in the URL
  const sortedOuter = [...outer].sort().join("");
  const id = `custom-${center}-${sortedOuter}`;

  // Cache key = canonical puzzle ID (letters only, order-independent).
  // The same key is used for localStorage persistence so the cache can never
  // serve stale words for a given URL.
  let validWords = validWordsCache.get(id);
  if (!validWords) {
    // Cold path: load + scan the full word list.  The dynamic import keeps the
    // 19.5 MB JSON out of this module's cold-start cost; Node's module cache
    // makes repeat import() calls free within the same process.
    const wordList: string[] =
      language === "el"
        ? ((await import("../words-el.json")).default as string[])
        : [];
    validWords = computeValidWords(center, outer, wordList);
    validWordsCache.set(id, validWords);
  }

  return {
    id,
    language,
    centerLetter: center,
    outerLetters: outer,
    validWords,
    date: "",
  };
}
