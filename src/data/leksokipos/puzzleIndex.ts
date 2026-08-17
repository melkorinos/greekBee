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
import { greekToGreeklish } from "@/lib/greeklish";
import { todayISO } from "@/lib/puzzleDate";
import { pickByDateOrRotate } from "@/lib/puzzleRotation";
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
 * Slim mirror of getPuzzleForDate (see ./index.ts). Behaviour must stay
 * identical — the redirect page relies on both producing the same puzzle for
 * the same input — so both delegate the whole rule to pickByDateOrRotate
 * rather than each spelling out a miss fallback that can drift.
 */
export function getPuzzleStubForDate(date: string, language: Language = "el"): LeksokiposPuzzleStub {
  const stubs = STUBS[language];

  if (stubs.length === 0) {
    throw new Error(`No puzzles available for language: ${language}`);
  }

  return pickByDateOrRotate(date, stubs);
}

/** Slim mirror of getTodaysPuzzle (see ./index.ts). */
export function getTodaysPuzzleStub(language: Language = "el"): LeksokiposPuzzleStub {
  return getPuzzleStubForDate(todayISO(), language);
}

/**
 * Canonical greeklish URL params for every prebuilt puzzle — the source for
 * the [center]/[outer] page's generateStaticParams, so all known daily combos
 * are prerendered at build time and served from the CDN with zero Fluid CPU.
 *
 * Must stay in lock-step with the page's canonical form (greeklish, lowercase,
 * outer letters in file order): a non-canonical param would prerender a page
 * whose own redirect check immediately 301s it. Guarded in puzzleIndex.test.ts.
 */
export function getPrebuiltPuzzleParams(language: Language = "el"): { center: string; outer: string }[] {
  return STUBS[language].map((stub) => ({
    center: greekToGreeklish(stub.centerLetter),
    outer: greekToGreeklish(stub.outerLetters.join("")),
  }));
}

/** Slim mirror of getRandomPuzzle (see ./index.ts): optional exclusion by ID. */
export function getRandomPuzzleStub(language: Language, excludeId?: string): LeksokiposPuzzleStub {
  const list = STUBS[language];
  const candidates = excludeId ? list.filter((p) => p.id !== excludeId) : list;
  const pool = candidates.length > 0 ? candidates : list;
  return pool[Math.floor(Math.random() * pool.length)];
}
