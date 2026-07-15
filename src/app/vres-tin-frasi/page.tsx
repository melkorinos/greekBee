// Vres Tin Frasi — server component.
// Loads today's phrase puzzle and word pools, then passes them to the client board.

import { getTodaysVresTinFrasiPuzzle, getTodayDateString } from "@/data/vrestifrasi";
import { resolvePuzzleDateParam } from "@/lib/puzzleDate";
import { VresTinFrasiPageClient } from "@/components/vrestifrasi/VresTinFrasiPageClient";
import { getValidWords } from "@/data/leksiarxeio";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";
import words2 from "@/data/leksiarxeio/words-2.json";
import words3 from "@/data/leksiarxeio/words-3.json";

export const dynamic = "force-dynamic";

interface VresTinFrasiPageProps {
  searchParams: Promise<{ puzzle?: string }>;
}

export default async function VresTinFrasiPage({ searchParams }: VresTinFrasiPageProps) {
  const { puzzle: puzzleParam } = await searchParams;
  const today = resolvePuzzleDateParam(puzzleParam, getTodayDateString());
  const { puzzle, submitter_name } = await getTodaysVresTinFrasiPuzzle(today);

  // Supply all word pools (2–8) to validate phrase guess words.
  // Short words (2–3 letters) cover particles, articles, prepositions used in phrases.
  const allWords = [
    ...(words2 as string[]),
    ...(words3 as string[]),
    ...getValidWords(4 as LeksiarxeioLength),
    ...getValidWords(5 as LeksiarxeioLength),
    ...getValidWords(6 as LeksiarxeioLength),
    ...getValidWords(7 as LeksiarxeioLength),
    ...getValidWords(8 as LeksiarxeioLength),
  ];

  return (
    <main data-game="vrestifrasi" className="flex flex-1 flex-col items-center gap-2 px-4 pt-4 bg-background text-foreground">
      {submitter_name && (
        <p className="text-xs text-muted self-center">
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
