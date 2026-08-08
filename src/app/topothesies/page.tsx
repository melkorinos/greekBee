// Topothesies — server component.
// Resolves today's date → the deterministic daily entry (selectDailyPuzzle over
// answers.json), then inlines ONLY that entry's precomputed silhouette. The full
// shapes.json never reaches the client (ADR 0018 — flat bundle/CPU): the client
// gets today's one path + all answer METADATA (autocomplete + hint centroids).

import { TOPOTHESIES } from "@/config/gameRules";
import { getTopothesiesShape, TOPOTHESIES_ANSWERS } from "@/data/topothesies";
import { selectDailyPuzzle } from "@/games/topothesies/lib/selectDailyPuzzle";
import { resolvePuzzleDateParam, todayISO } from "@/lib/puzzleDate";

import { GamePageShell } from "@/components/shared/GamePageShell";
import { TopothesiesPageClient } from "@/components/topothesies/TopothesiesPageClient";

export const dynamic = "force-dynamic";

interface TopothesiesPageProps {
  searchParams: Promise<{ puzzle?: string }>;
}

export default async function TopothesiesPage({ searchParams }: TopothesiesPageProps) {
  const { puzzle: puzzleParam } = await searchParams;
  const today = resolvePuzzleDateParam(puzzleParam, todayISO());
  const target = selectDailyPuzzle(today, TOPOTHESIES_ANSWERS);
  const shape = getTopothesiesShape(target.id);

  return (
    <GamePageShell gameId="topothesies">
      <TopothesiesPageClient
        answers={TOPOTHESIES_ANSWERS}
        target={target}
        shape={shape}
        today={today}
        maxKm={TOPOTHESIES.PROXIMITY_MAX_KM}
      />
    </GamePageShell>
  );
}
