// Leksiarxeio — server component.
// Loads all 5 daily puzzles (lengths 4–8) and passes them to the client board.
// The client manages which length is currently active.

import { WORDLE_LENGTHS, getAllTodaysWordlePuzzles, getTodayDateString, getValidWords } from "@/data/leksiarxeio";

import type { WordleLength } from "@/games/leksiarxeio/types";
import { WordlePageClient } from "@/components/leksiarxeio/WordleHeader";

export const dynamic = "force-dynamic"; // Ensure fresh date on each request

export default function WordlePage() {
  const today   = getTodayDateString();
  const puzzles = getAllTodaysWordlePuzzles(today);
  const wordLists = Object.fromEntries(
    WORDLE_LENGTHS.map((l) => [l, getValidWords(l as WordleLength)])
  ) as Record<WordleLength, string[]>;

  return (
    <main className="flex flex-col items-center gap-2 px-4 pt-4 bg-zinc-900 text-stone-100">
      <WordlePageClient puzzles={puzzles} wordLists={wordLists} today={today} />
    </main>
  );
}
