// Λεξοδρομία — server component.
// Resolves today's date → deterministic daily puzzle (selection + scramble are
// pure functions over ~300 KB of static answer pools — no words-el.json, no DB).

import { getTodayDateString, getTodaysLeksodromiaPuzzle } from "@/data/leksodromia";
import { resolvePuzzleDateParam } from "@/lib/puzzleDate";

import { LeksodromiaPageClient } from "@/components/leksodromia/LeksodromiaPageClient";
import { GamePageShell } from "@/components/shared/GamePageShell";

export const dynamic = "force-dynamic";

interface LeksodromiaPageProps {
  searchParams: Promise<{ puzzle?: string }>;
}

export default async function LeksodromiaPage({ searchParams }: LeksodromiaPageProps) {
  const { puzzle: puzzleParam } = await searchParams;
  const today = resolvePuzzleDateParam(puzzleParam, getTodayDateString());
  const puzzle = getTodaysLeksodromiaPuzzle(today);

  return (
    <GamePageShell gameId="leksodromia">
      <LeksodromiaPageClient puzzle={puzzle} today={today} />
    </GamePageShell>
  );
}
