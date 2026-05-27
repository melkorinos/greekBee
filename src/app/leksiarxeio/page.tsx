// Leksiarxeio — server component.
// Loads all 5 daily puzzles (lengths 4–8) and passes them to the client board.
// The client manages which length is currently active.

import { LEKSIARXEIO_LENGTHS, getAllTodaysLeksiarxeioPuzzles, getTodayDateString, getValidWords } from "@/data/leksiarxeio";

import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";
import { LeksiarxeioPageClient } from "@/components/leksiarxeio/LeksiarxeioHeader";

export const dynamic = "force-dynamic"; // Ensure fresh date on each request

export default function LeksiarxeioPage() {
  const today   = getTodayDateString();
  const puzzles = getAllTodaysLeksiarxeioPuzzles(today);
  const wordLists = Object.fromEntries(
    LEKSIARXEIO_LENGTHS.map((l) => [l, getValidWords(l as LeksiarxeioLength)])
  ) as Record<LeksiarxeioLength, string[]>;

  return (
    <main className="flex flex-1 flex-col items-center gap-2 px-4 pt-4 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <LeksiarxeioPageClient puzzles={puzzles} wordLists={wordLists} today={today} />
    </main>
  );
}
