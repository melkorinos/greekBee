// Spelling Bee puzzle data access layer.
// Loads puzzle definitions from the local JSON file.
// Also exposes buildCustomPuzzle() for the dynamic /spelling-bee/[center]/[outer] route.

import type { Language } from "@/types";
import type { Puzzle } from "@/games/spelling-bee/types";
import { computeValidWords } from "@/games/spelling-bee/lib/computeValidWords";
import greekPuzzles from "./puzzles-el.json";
import { normalizeLetters } from "@/games/spelling-bee/lib/normalize";
import wordListEl from "../words-el.json";

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

/**
 * Looks up a curated puzzle by its letter combination (center + outer set).
 * Returns the curated puzzle if found, null otherwise.
 * Used by the [center]/[outer] page to detect when a URL matches a daily puzzle
 * so the real puzzle ID (e.g. "2026-05-18-el") reaches GameBoard instead of
 * the synthetic "custom-..." ID — which enables the leaderboard.
 */
export function getCuratedPuzzleByLetters(
  center: string,
  outer: string[],
  language: Language = "el"
): Puzzle | null {
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
 * The `date` field is set to today so the UI displays something sensible, but
 * it plays no role in word-validity logic.
 */
export function buildCustomPuzzle(
  centerLetter: string,
  outerLetters: string[],
  language: Language = "el"
): Puzzle {
  const center = normalizeLetters(centerLetter);
  const outer = outerLetters.map(normalizeLetters);

  // Stable canonical ID regardless of outer-letter order in the URL
  const sortedOuter = [...outer].sort().join("");
  const id = `custom-${center}-${sortedOuter}`;

  const today = new Date().toISOString().split("T")[0];

  const wordList: string[] =
    language === "el" ? (wordListEl as string[]) : [];

  const validWords = computeValidWords(center, outer, wordList);

  return {
    id,
    language,
    centerLetter: center,
    outerLetters: outer,
    validWords,
    date: today,
  };
}
