// Leksiarxeio — data loader (runs server-side via Next.js App Router).
// Primary source: community_leksiarxeio_puzzles (approved FIFO).
// Fallback: deterministic word-pool rotation by date.
//
// One community puzzle row covers all 5 lengths. The row is deleted immediately
// on consumption so it is never served again.

import { getSupabaseClient } from "@/lib/supabase";
import type { LeksiarxeioLength, LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";

import words4 from "./words-4.json";
import words5 from "./words-5.json";
import words6 from "./words-6.json";
import words7 from "./words-7.json";
import words8 from "./words-8.json";

export const LEKSIARXEIO_LENGTHS: LeksiarxeioLength[] = [4, 5, 6, 7, 8];

const WORD_LISTS: Record<LeksiarxeioLength, string[]> = {
  3: [],
  4: words4 as string[],
  5: words5 as string[],
  6: words6 as string[],
  7: words7 as string[],
  8: words8 as string[],
};

function dateToIndex(dateStr: string, listLength: number): number {
  const epoch = new Date("2025-01-01").getTime();
  const target = new Date(dateStr).getTime();
  const dayOffset = Math.floor((target - epoch) / 86_400_000);
  return ((dayOffset % listLength) + listLength) % listLength;
}

function buildFallbackPuzzle(date: string, length: LeksiarxeioLength): LeksiarxeioPuzzle {
  const pool = WORD_LISTS[length];
  if (!pool || pool.length === 0) throw new Error(`No word list for length ${length}`);
  const answer = pool[dateToIndex(date, pool.length)];
  return { id: `${date}-wordle-${length}`, date, answer, length };
}

interface LeksiarxeioDaily {
  puzzles: LeksiarxeioPuzzle[];
  submitter_name: string | null;
}

/**
 * Returns all 5 daily Leksiarxeio puzzles for `date`.
 * Checks the community queue first; falls back to static word pools.
 */
export async function getAllTodaysLeksiarxeioPuzzles(date: string): Promise<LeksiarxeioDaily> {
  try {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("community_leksiarxeio_puzzles") as any)
      .select("id, submitter_name, data")
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!error && data) {
      const row = data as { id: number; submitter_name: string; data: Record<string, string> };

      // Delete immediately — consumed puzzles are never reused
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("community_leksiarxeio_puzzles") as any).delete().eq("id", row.id);

      const puzzles = LEKSIARXEIO_LENGTHS.map((len): LeksiarxeioPuzzle => ({
        id:     `${date}-wordle-${len}`,
        date,
        answer: (row.data[String(len)] ?? "").toLowerCase(),
        length: len,
      }));

      return { puzzles, submitter_name: row.submitter_name || null };
    }
  } catch {
    // Fall through to static fallback on any error
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

/** Returns today's ISO date string (YYYY-MM-DD) using the server clock */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
