// Vres Tin Frasi — data loader (runs server-side via Next.js App Router).
// Primary source: the community phrase scheduled for the requested date.
// Fallback: deterministic rotation through phrases-el.json by date.

import { consumeApprovedPuzzle } from "@/lib/communityPuzzleLifecycle";
import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import { normalizeLetters } from "@/lib/normalize";
import { dateToIndex } from "@/lib/puzzleRotation";

import phrasesData from "./phrases-el.json";

interface PhraseEntry { phrase: string }
const PHRASES: PhraseEntry[] = phrasesData as PhraseEntry[];

// ─── Helpers ──────────────────────────────────────────────────────────────────


function buildPuzzle(date: string, phraseDisplay: string): VresTinFrasiPuzzle {
  const normalizedWords = phraseDisplay
    .split(" ")
    .map((w) => normalizeLetters(w));
  return {
    id:             `${date}-vresi`,
    date,
    phrase:         phraseDisplay,
    normalizedWords,
    wordLengths:    normalizedWords.map((w) => w.length),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

interface VresTinFrasiDaily {
  puzzle:         VresTinFrasiPuzzle;
  submitter_name: string | null;
}

/**
 * Returns the daily Vres Tin Frasi puzzle for `date`.
 * A community phrase scheduled for that date wins; otherwise the static phrase
 * pool's deterministic rotation. Both are stable across repeat calls, so every
 * player on a date sees the same phrase however many times the page reloads.
 */
export async function getTodaysVresTinFrasiPuzzle(date: string): Promise<VresTinFrasiDaily> {
  const consumed = await consumeApprovedPuzzle<{ phrase: string }>(
    "community_vrestifrasi_puzzles",
    date,
  );
  if (consumed) {
    return {
      puzzle:         buildPuzzle(date, consumed.data.phrase),
      submitter_name: consumed.submitter_name,
    };
  }

  const entry = PHRASES[dateToIndex(date, PHRASES.length)];
  return {
    puzzle:         buildPuzzle(date, entry.phrase),
    submitter_name: null,
  };
}

/** Today's ISO date string (YYYY-MM-DD). Re-exported from `@/lib/puzzleDate`. */
export { todayISO as getTodayDateString } from "@/lib/puzzleDate";
