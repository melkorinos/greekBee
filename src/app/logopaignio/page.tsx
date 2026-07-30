// Λογοπαίγνιο — server component.
// Resolves today's date → the deterministic daily puzzle (selectDailyPuzzle over
// the id-sorted puzzles-el.json), then hands its metadata to the client. The
// interactive board (blur stepping, free-text guess, scoring, share) lives in the
// client tree.

import { LOGOPAIGNIO_PUZZLES } from "@/data/logopaignio";
import { selectDailyPuzzle } from "@/games/logopaignio/lib/selectDailyPuzzle";
import { resolvePuzzleDateParam, todayISO } from "@/lib/puzzleDate";

import { GamePageShell } from "@/components/shared/GamePageShell";
import { LogopaignioPageClient } from "@/components/logopaignio/LogopaignioPageClient";

export const dynamic = "force-dynamic";

interface LogopaignioPageProps {
  searchParams: Promise<{ puzzle?: string }>;
}

export default async function LogopaignioPage({ searchParams }: LogopaignioPageProps) {
  const { puzzle: puzzleParam } = await searchParams;
  const today = resolvePuzzleDateParam(puzzleParam, todayISO());
  const target = selectDailyPuzzle(today, LOGOPAIGNIO_PUZZLES);

  return (
    <GamePageShell gameId="logopaignio">
      <LogopaignioPageClient target={target} today={today} />
    </GamePageShell>
  );
}
