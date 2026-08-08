// Leksodromia — deterministic daily word selection (pure, no React).
// Every player gets the same 10 words on a given date: 2 distinct per length
// 4–8, ascending, drawn from Leksiarxeio's curated answer pools (passed in by
// the data loader — this module never touches JSON).
//
// Invariant: never selects one of Leksiarxeio's same-day fallback answers. How
// Leksiarxeio derives those is Leksiarxeio's knowledge — the loader passes the
// forbidden set in (getSameDayFallbackAnswers), so this module just excludes it.

import { LEKSODROMIA } from "@/config/gameRules";

import type { LeksodromiaLength } from "../types";

import { hashSeed, mulberry32 } from "./seededRandom";

/**
 * The 10 words of the daily Leksodromia puzzle, ascending by length
 * (2 × 4-letter, 2 × 5-letter, … 2 × 8-letter).
 *
 * @param date             - ISO date (YYYY-MM-DD) — the only source of randomness
 * @param pools            - Curated answer pool per length (each must hold ≥ 3 words)
 * @param forbiddenAnswers - Words to never select (Leksiarxeio's same-day answers)
 */
export function selectDailyWords(
  date: string,
  pools: Record<LeksodromiaLength, readonly string[]>,
  forbiddenAnswers: ReadonlySet<string>,
): string[] {
  const words: string[] = [];

  for (const length of LEKSODROMIA.LENGTHS) {
    const pool = pools[length];
    if (pool.length < LEKSODROMIA.WORDS_PER_LENGTH + 1) {
      throw new Error(`Leksodromia needs ≥ ${LEKSODROMIA.WORDS_PER_LENGTH + 1} words in pool ${length}`);
    }

    const rand   = mulberry32(hashSeed(`leksodromia:${date}:${length}`));
    const picked = new Set<number>();

    while (picked.size < LEKSODROMIA.WORDS_PER_LENGTH) {
      const idx = Math.floor(rand() * pool.length);
      if (picked.has(idx) || forbiddenAnswers.has(pool[idx])) continue;
      picked.add(idx);
      words.push(pool[idx]);
    }
  }

  return words;
}
