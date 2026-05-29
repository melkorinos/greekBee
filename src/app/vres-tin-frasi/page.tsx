// Vres Tin Frasi — server component.
// Loads today's phrase puzzle and word pools, then passes them to the client board.

import { getTodaysVresTinFrasiPuzzle, getTodayDateString } from "@/data/vrestifrasi";
import { VresTinFrasiPageClient } from "@/components/vrestifrasi/VresTinFrasiPageClient";
import { getValidWords } from "@/data/leksiarxeio";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";

export const dynamic = "force-dynamic";

export default async function VresTinFrasiPage() {
  const today = getTodayDateString();
  const { puzzle, submitter_name } = await getTodaysVresTinFrasiPuzzle(today);

  // Supply all word pools (4–8) to validate phrase guess words.
  // Merge into a single array — each word's pool is looked up by length in the reducer.
  const allWords = [
    ...getValidWords(4 as LeksiarxeioLength),
    ...getValidWords(5 as LeksiarxeioLength),
    ...getValidWords(6 as LeksiarxeioLength),
    ...getValidWords(7 as LeksiarxeioLength),
    ...getValidWords(8 as LeksiarxeioLength),
  ];

  return (
    <main className="flex flex-1 flex-col items-center gap-2 px-4 pt-4 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {submitter_name && (
        <p className="text-xs text-stone-400 dark:text-stone-500 self-center">
          Παζλ από {submitter_name}
        </p>
      )}
      <VresTinFrasiPageClient
        puzzle={puzzle}
        validWords={allWords}
        today={today}
      />
    </main>
  );
}
