import { notFound } from "next/navigation";
import { StavroleksoPlayer } from "./StavroleksoPlayer";
import { getSupabaseClient } from "@/lib/supabase";
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("community_stavrolekso_puzzles") as any)
      .select("id, title, submitter_name, data, status")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as PuzzleRow;
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
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 dark:bg-stone-950 px-4 py-6">
      <div className="w-full max-w-sm space-y-3 mb-4">
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100">
          {puzzle.title ?? `Stavrolekso #${puzzle.id}`}
        </h1>
        {puzzle.submitter_name && (
          <p className="text-xs text-stone-400 dark:text-stone-500">από {puzzle.submitter_name}</p>
        )}
      </div>

      <StavroleksoPlayer
        id={puzzle.id}
        puzzle={{ ...puzzle.data, title: puzzle.title, submitter_name: puzzle.submitter_name }}
      />
    </main>
  );
}
