// Vres Tin Frasi — data loader (runs server-side via Next.js App Router).
// Primary source: community_vrestifrasi_puzzles (approved FIFO).
// Fallback: deterministic rotation through phrases-el.json by date.

import { getSupabaseClient } from "@/lib/supabase";
import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import { normalizeLetters } from "@/lib/normalize";

import phrasesData from "./phrases-el.json";

interface PhraseEntry { phrase: string }
const PHRASES: PhraseEntry[] = phrasesData as PhraseEntry[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateToIndex(dateStr: string, listLength: number): number {
  const epoch  = new Date("2025-01-01").getTime();
  const target = new Date(dateStr).getTime();
  const day    = Math.floor((target - epoch) / 86_400_000);
  return ((day % listLength) + listLength) % listLength;
}

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
 * Community queue is checked first; static phrase pool is the fallback.
 */
export async function getTodaysVresTinFrasiPuzzle(date: string): Promise<VresTinFrasiDaily> {
  try {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("community_vrestifrasi_puzzles") as any)
      .select("id, submitter_name, data")
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!error && data) {
      const row = data as { id: number; submitter_name: string; data: { phrase: string } };

      // Consume immediately — never reused
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("community_vrestifrasi_puzzles") as any).delete().eq("id", row.id);

      return {
        puzzle:         buildPuzzle(date, row.data.phrase),
        submitter_name: row.submitter_name || null,
      };
    }
  } catch {
    // Fall through to static fallback
  }

  const entry = PHRASES[dateToIndex(date, PHRASES.length)];
  return {
    puzzle:         buildPuzzle(date, entry.phrase),
    submitter_name: null,
  };
}

/** Today's ISO date string (YYYY-MM-DD), server clock. */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
