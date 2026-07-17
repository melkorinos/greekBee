// Λεξόπλεγμα — server component.
// Resolves today's date → deterministic daily puzzle (rotation over the
// committed generator batch + the Leksiarxeio same-day answer guard — static
// JSON only, no words-el.json anywhere near this route, no DB).

import { getPuzzleForDate, getTodayDateString } from "@/data/leksoplegma";
import { resolvePuzzleDateParam } from "@/lib/puzzleDate";

import { LeksoplegmaPageClient } from "@/components/leksoplegma/LeksoplegmaPageClient";
import { GamePageShell } from "@/components/shared/GamePageShell";

export const dynamic = "force-dynamic";

interface LeksoplegmaPageProps {
  searchParams: Promise<{ puzzle?: string }>;
}

export default async function LeksoplegmaPage({ searchParams }: LeksoplegmaPageProps) {
  const { puzzle: puzzleParam } = await searchParams;
  const today = resolvePuzzleDateParam(puzzleParam, getTodayDateString());
  const puzzle = getPuzzleForDate(today);

  return (
    <GamePageShell gameId="leksoplegma">
      <LeksoplegmaPageClient puzzle={puzzle} today={today} />
    </GamePageShell>
  );
}
