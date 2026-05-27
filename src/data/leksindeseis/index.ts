// Data loader for Leksindeseis puzzles.
// Primary source: community_leksindeseis_puzzles (approved FIFO).
// Fallback: puzzles-connections.json with deterministic date-based index.
// Returns null if no puzzle is available (both sources empty).

import { getSupabaseClient } from "@/lib/supabase";
import type { LeksindeseisPuzzle } from "@/games/leksindeseis/types";
import puzzles from "./puzzles-connections.json";

const ALL_PUZZLES = puzzles as LeksindeseisPuzzle[];

function dateToIndex(dateStr: string, listLength: number): number {
  const epoch = new Date("2025-01-01").getTime();
  const target = new Date(dateStr).getTime();
  const dayOffset = Math.floor((target - epoch) / 86_400_000);
  return ((dayOffset % listLength) + listLength) % listLength;
}

interface LeksindeseisDaily {
  puzzle: LeksindeseisPuzzle | null;
  submitter_name: string | null;
}

/**
 * Returns today's Leksindeseis puzzle for `date`.
 * Checks the community queue first; falls back to static pool.
 * Returns null puzzle if both sources are empty.
 */
export async function getTodaysLeksindeseisPuzzle(today: string): Promise<LeksindeseisDaily> {
  try {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("community_leksindeseis_puzzles") as any)
      .select("id, submitter_name, data")
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!error && data) {
      const row = data as { id: number; submitter_name: string; data: LeksindeseisPuzzle["groups"] };

      // Delete immediately — consumed puzzles are never reused
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("community_leksindeseis_puzzles") as any).delete().eq("id", row.id);

      const puzzle: LeksindeseisPuzzle = { date: today, groups: row.data };
      return { puzzle, submitter_name: row.submitter_name || null };
    }
  } catch {
    // Fall through to static fallback on any error
  }

  if (ALL_PUZZLES.length === 0) return { puzzle: null, submitter_name: null };

  const idx = dateToIndex(today, ALL_PUZZLES.length);
  return { puzzle: { ...ALL_PUZZLES[idx], date: today }, submitter_name: null };
}

export { ALL_PUZZLES as allLeksindeseisPuzzles };
