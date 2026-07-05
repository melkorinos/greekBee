// Leksokipos slim puzzle index — letters + dates only, no validWords.
//
// Backed by puzzles-index-el.json (~108 KB), generated from puzzles-el.json by
// `npm run generate-puzzle-index`. A drift test (puzzleIndex.test.ts) keeps the
// two files in sync.
//
// Why this module exists (Fluid Active CPU):
// The /leksokipos redirect page only needs a puzzle's letters to build the
// canonical /[center]/[outer] URL. Importing the full data loader (index.ts)
// pulls puzzles-el.json (4 MB) + words-el.json (19 MB) into the route's module
// graph, so every cold start paid ~0.5–1 s of JSON-parse CPU to issue a
// redirect. This module keeps that route's parse cost at ~1 ms.
//
// Anything that needs validWords must keep importing "./index" instead.

import type { Language } from "@/types";
import puzzleIndexEl from "./puzzles-index-el.json";

/** A pre-built puzzle minus its validWords — enough to build its canonical URL. */
export interface LeksokiposPuzzleStub {
  id: string;
  date: string;
  centerLetter: string;
  outerLetters: string[];
}

const STUBS: Record<Language, LeksokiposPuzzleStub[]> = {
  el: puzzleIndexEl as LeksokiposPuzzleStub[],
};

/**
 * Slim mirror of getPuzzleForDate (see ./index.ts): match by date, fall back
 * to the most recent puzzle. Behaviour must stay identical — the redirect page
 * relies on both producing the same puzzle for the same input.
 */
export function getPuzzleStubForDate(date: string, language: Language = "el"): LeksokiposPuzzleStub {
  const stubs = STUBS[language];

  if (stubs.length === 0) {
    throw new Error(`No puzzles available for language: ${language}`);
  }

  return stubs.find((p) => p.date === date) ?? stubs[stubs.length - 1];
}

/** Slim mirror of getTodaysPuzzle (see ./index.ts). */
export function getTodaysPuzzleStub(language: Language = "el"): LeksokiposPuzzleStub {
  const today = new Date().toISOString().split("T")[0];
  return getPuzzleStubForDate(today, language);
}

/** Slim mirror of getRandomPuzzle (see ./index.ts): optional exclusion by ID. */
export function getRandomPuzzleStub(language: Language, excludeId?: string): LeksokiposPuzzleStub {
  const list = STUBS[language];
  const candidates = excludeId ? list.filter((p) => p.id !== excludeId) : list;
  const pool = candidates.length > 0 ? candidates : list;
  return pool[Math.floor(Math.random() * pool.length)];
}
