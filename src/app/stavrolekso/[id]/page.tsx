import { notFound } from "next/navigation";
import { StavroleksoPlayer } from "./StavroleksoPlayer";
import { getSupabaseClient, table } from "@/lib/supabase";
import { GamePageShell } from "@/components/shared/GamePageShell";
import type { StavroleksoPuzzleData } from "@/games/stavrolekso/types";

interface PuzzleRow {
  id: number;
  title: string | null;
  submitter_name: string;
  status: string;
  data: StavroleksoPuzzleData;
}

async function getPuzzle(id: string): Promise<PuzzleRow | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await table(supabase, "community_stavrolekso_puzzles")
      .select("id, title, submitter_name, data, status")
      // The route param is a string; the column is a bigint.
      .eq("id", Number(id))
      .single();
    if (error || !data) return null;
    // `data` is jsonb — the DB types it as Json and knows nothing of the puzzle
    // shape inside. StavroleksoPuzzleData is a game-level contract enforced by
    // validateStavroleksoSubmission on the way in, so the double cast is the
    // honest way to say "narrower than the DB can prove".
    return data as unknown as PuzzleRow;
  } catch {
    return null;
  }
}

export default async function StavroleksoPuzzlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const puzzle = await getPuzzle(id);

  if (!puzzle || puzzle.status !== "approved") notFound();

  return (
    <GamePageShell gameId="stavrolekso">
      <div className="w-full max-w-game space-y-3 mb-4">
        <h1 className="text-xl font-bold text-foreground">
          {puzzle.title ?? `Stavrolekso #${puzzle.id}`}
        </h1>
        {puzzle.submitter_name && (
          <p className="text-xs text-muted">από {puzzle.submitter_name}</p>
        )}
      </div>

      <StavroleksoPlayer
        id={puzzle.id}
        puzzle={{ ...puzzle.data, title: puzzle.title, submitter_name: puzzle.submitter_name }}
      />
    </GamePageShell>
  );
}
