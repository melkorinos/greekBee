// Leksodromia — data loader (runs server-side via Next.js App Router).
// Deterministic daily puzzle: 10 words (2 × lengths 4–8) selected and
// scrambled from the date alone — same puzzle for every player.
//
// Read-only reuse of Leksiarxeio's curated answer pools + its same-day
// fallback-answer set, both sourced from @/data/leksiarxeio/answerPools — the
// Fluid-safe module that imports only answers-*.json, never the MB-scale
// words-*.json guess lists (which the Leksiarxeio index barrel pulls in).

import { scrambleWord } from "@/games/leksodromia/lib/scrambleWord";
import { selectDailyWords } from "@/games/leksodromia/lib/selectDailyWords";
import {
  LEKSIARXEIO_ANSWER_POOLS,
  getSameDayFallbackAnswers,
} from "@/data/leksiarxeio/answerPools";

// Precomputed answer → valid-anagram alternates (see
// scripts/generate-leksodromia-anagrams.ts). ~400 KB, keyed by answer-pool word;
// only words with alternates appear. Deliberately NOT the MB-scale guess lists,
// which must never enter this route's cold-start budget.
import anagramAlternates from "./anagramAlternates.json";

const ALTERNATES = anagramAlternates as Record<string, string[]>;

export interface LeksodromiaPuzzle {
  /** ISO date (YYYY-MM-DD) — the puzzle id. */
  date:      string;
  /** The 10 answers, ascending by length. */
  words:     string[];
  /** Deterministic scrambled form of each word (parallel to `words`). */
  scrambles: string[];
  /**
   * Every accepted input per word (parallel to `words`): the canonical answer
   * first, then any valid Greek anagram of the same rack.
   */
  accepted:  string[][];
}

/** The daily Leksodromia puzzle for `date` — pure, no I/O beyond static data. */
export function getTodaysLeksodromiaPuzzle(date: string): LeksodromiaPuzzle {
  const words = selectDailyWords(date, LEKSIARXEIO_ANSWER_POOLS, getSameDayFallbackAnswers(date));
  return {
    date,
    words,
    scrambles: words.map((w) => scrambleWord(w, date)),
    accepted:  words.map((w) => [w, ...(ALTERNATES[w] ?? [])]),
  };
}

/** Today's ISO date string (YYYY-MM-DD). Re-exported from `@/lib/puzzleDate`. */
export { todayISO as getTodayDateString } from "@/lib/puzzleDate";
