// Leksiarxeio answer pools + the same-day fallback-answer derivation.
//
// Leksiarxeio picks each day's Wordle answer as `pool[dateToIndex(date, len)]`
// (see buildFallbackPuzzle in ./index.ts). A derived game must never surface one
// of those same-day answers — the recap would leak another game's daily answer.
// That "which word is Leksiarxeio's answer today" knowledge belongs to Leksiarxeio;
// this module owns it as `getSameDayFallbackAnswers`, so the indexing math and the
// pool layout stay implementation and no derived game re-derives them.
//
// This file imports ONLY the answers-*.json pools (≈300 KB) — never words-*.json
// nor the Leksiarxeio index barrel, whose module graph statically pulls the
// MB-scale guess lists (Fluid CPU: derived-game routes must not parse those on
// cold start). Both the Fluid-safe import block and the leak knowledge now live
// here, in one place, instead of copied into each derived game's loader.

import { dateToIndex } from "@/lib/puzzleRotation";

import answers4 from "./answers-4.json";
import answers5 from "./answers-5.json";
import answers6 from "./answers-6.json";
import answers7 from "./answers-7.json";
import answers8 from "./answers-8.json";

/** Curated daily-answer pools keyed by word length (4–8). Read-only reuse only. */
export const LEKSIARXEIO_ANSWER_POOLS: Record<4 | 5 | 6 | 7 | 8, readonly string[]> = {
  4: answers4 as string[],
  5: answers5 as string[],
  6: answers6 as string[],
  7: answers7 as string[],
  8: answers8 as string[],
};

const ALL_POOLS: readonly (readonly string[])[] = Object.values(LEKSIARXEIO_ANSWER_POOLS);

/**
 * Leksiarxeio's static fallback answers for `date` — the one answer per length it
 * serves when no community puzzle is queued (`pool[dateToIndex]`). Returned as a
 * set so a derived game can forbid every one without re-deriving the indexing
 * math or knowing the pool layout.
 */
export function getSameDayFallbackAnswers(date: string): ReadonlySet<string> {
  return new Set(ALL_POOLS.map((pool) => pool[dateToIndex(date, pool.length)]));
}
