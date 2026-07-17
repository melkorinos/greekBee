// Leksiarxeio — server component.
// Loads all 5 daily puzzles (lengths 4–8) and passes them to the client board.
// Community queue is checked first; static word pools are the fallback.

import { LEKSIARXEIO_LENGTHS, getAllTodaysLeksiarxeioPuzzles, getTodayDateString, getValidWords } from "@/data/leksiarxeio";
import { resolvePuzzleDateParam } from "@/lib/puzzleDate";

import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";
import { LeksiarxeioPageClient } from "@/components/leksiarxeio/LeksiarxeioPageClient";
import { GamePageShell } from "@/components/shared/GamePageShell";

export const dynamic = "force-dynamic";

interface LeksiarxeioPageProps {
  searchParams: Promise<{ puzzle?: string }>;
}

export default async function LeksiarxeioPage({ searchParams }: LeksiarxeioPageProps) {
  const { puzzle: puzzleParam } = await searchParams;
  const today = resolvePuzzleDateParam(puzzleParam, getTodayDateString());
  const { puzzles, submitter_name } = await getAllTodaysLeksiarxeioPuzzles(today);
  const wordLists = Object.fromEntries(
    LEKSIARXEIO_LENGTHS.map((l) => [l, getValidWords(l as LeksiarxeioLength)])
  ) as Record<LeksiarxeioLength, string[]>;

  return (
    <GamePageShell gameId="leksiarxeio">
      {submitter_name && (
        <p className="text-xs text-muted self-center">
          Παζλ από {submitter_name}
        </p>
      )}
      <LeksiarxeioPageClient puzzles={puzzles} wordLists={wordLists} today={today} />
    </GamePageShell>
  );
}
