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

export interface LeksodromiaPuzzle {
  /** ISO date (YYYY-MM-DD) — the puzzle id. */
  date:      string;
  /** The 10 answers, ascending by length. */
  words:     string[];
  /** Deterministic scrambled form of each word (parallel to `words`). */
  scrambles: string[];
}

/** The daily Leksodromia puzzle for `date` — pure, no I/O beyond static data. */
export function getTodaysLeksodromiaPuzzle(date: string): LeksodromiaPuzzle {
  const words = selectDailyWords(date, LEKSIARXEIO_ANSWER_POOLS, getSameDayFallbackAnswers(date));
  return {
    date,
    words,
    scrambles: words.map((w) => scrambleWord(w, date)),
  };
}

/** Returns today's ISO date string (YYYY-MM-DD) using the server clock. */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
