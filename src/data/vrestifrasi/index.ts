// Vres Tin Frasi — data loader (runs server-side via Next.js App Router).
// Source: deterministic rotation through phrases-el.json by date.
//
// The Game accepted player-submitted phrases until 2026-08-20 (ADR 0027). The
// static rotation that was the fallback is now the only path, and the same date
// returns the same phrase it always did — the queue was empty when it was removed.

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
  puzzle: VresTinFrasiPuzzle;
}

/**
 * Returns the daily Vres Tin Frasi puzzle for `date`, from the static phrase
 * pool's deterministic rotation. Stable across repeat calls, so every player on
 * a date sees the same phrase however many times the page reloads.
 *
 * Stays `async` although nothing is awaited: every caller is a server component
 * or a test that already awaits it.
 */
export async function getTodaysVresTinFrasiPuzzle(date: string): Promise<VresTinFrasiDaily> {
  const entry = PHRASES[dateToIndex(date, PHRASES.length)];
  return { puzzle: buildPuzzle(date, entry.phrase) };
}

/** Today's ISO date string (YYYY-MM-DD). Re-exported from `@/lib/puzzleDate`. */
export { todayISO as getTodayDateString } from "@/lib/puzzleDate";
