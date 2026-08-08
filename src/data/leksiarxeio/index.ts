// Leksiarxeio — data loader (runs server-side via Next.js App Router).
// Primary source: the community puzzle scheduled for the requested date.
// Fallback: deterministic word-pool rotation by date.
//
// One community puzzle row covers all 5 lengths, and is served — not consumed —
// for the date it was scheduled for.

import { consumeApprovedPuzzle } from "@/lib/communityPuzzleLifecycle";
import type { LeksiarxeioLength, LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";
import { LEKSIARXEIO } from "@/config/gameRules";
import { dateToIndex } from "@/lib/puzzleRotation";

import words4 from "./words-4.json";
import words5 from "./words-5.json";
import words6 from "./words-6.json";
import words7 from "./words-7.json";
import words8 from "./words-8.json";
import answers4 from "./answers-4.json";
import answers5 from "./answers-5.json";
import answers6 from "./answers-6.json";
import answers7 from "./answers-7.json";
import answers8 from "./answers-8.json";

export const LEKSIARXEIO_LENGTHS: LeksiarxeioLength[] = [...LEKSIARXEIO.LENGTHS];

const WORD_LISTS: Record<LeksiarxeioLength, string[]> = {
  4: words4 as string[],
  5: words5 as string[],
  6: words6 as string[],
  7: words7 as string[],
  8: words8 as string[],
};

const ANSWER_POOLS: Record<LeksiarxeioLength, string[]> = {
  4: answers4 as string[],
  5: answers5 as string[],
  6: answers6 as string[],
  7: answers7 as string[],
  8: answers8 as string[],
};


function buildFallbackPuzzle(date: string, length: LeksiarxeioLength): LeksiarxeioPuzzle {
  const pool = getAnswerPool(length);
  if (pool.length === 0) throw new Error(`No answer pool for length ${length}`);
  const answer = pool[dateToIndex(date, pool.length)];
  return { id: `${date}-wordle-${length}`, date, answer, length };
}

interface LeksiarxeioDaily {
  puzzles: LeksiarxeioPuzzle[];
  submitter_name: string | null;
}

/**
 * Returns all 5 daily Leksiarxeio puzzles for `date`.
 * A community puzzle scheduled for that date wins; otherwise the static answer
 * pools' deterministic rotation. Both are stable across repeat calls.
 */
export async function getAllTodaysLeksiarxeioPuzzles(date: string): Promise<LeksiarxeioDaily> {
  const consumed = await consumeApprovedPuzzle<Record<string, string>>(
    "community_leksiarxeio_puzzles",
    date,
  );
  if (consumed) {
    const puzzles = LEKSIARXEIO_LENGTHS.map((len): LeksiarxeioPuzzle => ({
      id:     `${date}-wordle-${len}`,
      date,
      answer: (consumed.data[String(len)] ?? "").toLowerCase(),
      length: len,
    }));
    return { puzzles, submitter_name: consumed.submitter_name };
  }

  return {
    puzzles: LEKSIARXEIO_LENGTHS.map((l) => buildFallbackPuzzle(date, l)),
    submitter_name: null,
  };
}

/**
 * Returns the word list for a given length — used for guess validation.
 */
export function getValidWords(length: LeksiarxeioLength = 4): string[] {
  return WORD_LISTS[length] ?? [];
}

/**
 * Returns the curated answer pool for a given length — used for daily puzzle rotation.
 * Falls back to the full word list if no curated pool exists.
 */
export function getAnswerPool(length: LeksiarxeioLength = 4): string[] {
  const pool = ANSWER_POOLS[length];
  return pool && pool.length > 0 ? pool : WORD_LISTS[length] ?? [];
}

/** Today's ISO date string (YYYY-MM-DD). Re-exported from `@/lib/puzzleDate`. */
export { todayISO as getTodayDateString } from "@/lib/puzzleDate";
