// Πόσο κάνει; — server component.
// Resolves today's date → the deterministic daily puzzle (selectDailyPuzzle over
// puzzles-el.json), then hands its metadata to the client. Prices are frozen in
// the JSON at build time; nothing calls the gov price observatory at play time.

import { POSOKANEI_PUZZLES } from "@/data/posokanei";
import { selectDailyPuzzle } from "@/games/posokanei/lib/selectDailyPuzzle";
import { resolvePuzzleDateParam, todayISO } from "@/lib/puzzleDate";

import { GamePageShell } from "@/components/shared/GamePageShell";
import { PosokaneiPageClient } from "@/components/posokanei/PosokaneiPageClient";

export const dynamic = "force-dynamic";

interface PosokaneiPageProps {
  searchParams: Promise<{ puzzle?: string }>;
}

export default async function PosokaneiPage({ searchParams }: PosokaneiPageProps) {
  const { puzzle: puzzleParam } = await searchParams;
  const today = resolvePuzzleDateParam(puzzleParam, todayISO());
  const target = selectDailyPuzzle(today, POSOKANEI_PUZZLES);

  return (
    <GamePageShell gameId="posokanei">
      <PosokaneiPageClient target={target} today={today} />
    </GamePageShell>
  );
}
