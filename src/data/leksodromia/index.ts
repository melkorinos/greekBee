// Leksodromia — data loader (runs server-side via Next.js App Router).
// Deterministic daily puzzle: 10 words (2 × lengths 4–8) selected and
// scrambled from the date alone — same puzzle for every player.
//
// Read-only reuse of Leksiarxeio's curated answer pools. The answers-*.json
// files are imported DIRECTLY (≈300 KB total) — never via @/data/leksiarxeio,
// whose module graph statically imports the MB-scale words-*.json guess lists
// (Fluid CPU: this route must not parse those on cold start).

import type { LeksodromiaLength } from "@/games/leksodromia/types";
import { scrambleWord } from "@/games/leksodromia/lib/scrambleWord";
import { selectDailyWords } from "@/games/leksodromia/lib/selectDailyWords";

import answers4 from "../leksiarxeio/answers-4.json";
import answers5 from "../leksiarxeio/answers-5.json";
import answers6 from "../leksiarxeio/answers-6.json";
import answers7 from "../leksiarxeio/answers-7.json";
import answers8 from "../leksiarxeio/answers-8.json";

const ANSWER_POOLS: Record<LeksodromiaLength, readonly string[]> = {
  4: answers4 as string[],
  5: answers5 as string[],
  6: answers6 as string[],
  7: answers7 as string[],
  8: answers8 as string[],
};

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
  const words = selectDailyWords(date, ANSWER_POOLS);
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
