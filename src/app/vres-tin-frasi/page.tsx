// Vres Tin Frasi — server component.
// Loads today's phrase puzzle and word pools, then passes them to the client board.

import { getTodaysVresTinFrasiPuzzle, getTodayDateString } from "@/data/vrestifrasi";
import { resolvePuzzleDateParam } from "@/lib/puzzleDate";
import { VresTinFrasiPageClient } from "@/components/vrestifrasi/VresTinFrasiPageClient";
import { GamePageShell } from "@/components/shared/GamePageShell";
import { getValidWords } from "@/data/leksiarxeio";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";
import words1 from "@/data/vrestifrasi/words-1.json";
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

  // Supply all word pools (1–8) to validate phrase guess words.
  // Short words (1–3 letters) cover the standalone articles «η»/«ο» plus the
  // particles, articles and prepositions phrases are built from. 8 letters is a
  // deliberate ceiling: the phrase corpus is authored to fit the pool, so no
  // 9+ pool is loaded (which would mean scanning the 795k-word master list).
  const allWords = [
    ...(words1 as string[]),
    ...(words2 as string[]),
    ...(words3 as string[]),
    ...getValidWords(4 as LeksiarxeioLength),
    ...getValidWords(5 as LeksiarxeioLength),
    ...getValidWords(6 as LeksiarxeioLength),
    ...getValidWords(7 as LeksiarxeioLength),
    ...getValidWords(8 as LeksiarxeioLength),
  ];

  return (
    <GamePageShell gameId="vrestifrasi">
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
    </GamePageShell>
  );
}
