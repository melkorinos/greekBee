import { notFound } from "next/navigation";
import { StavroleksoPlayer } from "./StavroleksoPlayer";
import type { StavroleksoPuzzleData } from "@/games/stavrolekso/types";

interface PuzzleRow {
  id: number;
  title: string | null;
  submitter_name: string;
  status: string;
  data: StavroleksoPuzzleData;
}

async function getPuzzle(id: string): Promise<PuzzleRow | null> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res  = await fetch(`${base}/api/community-puzzles/stavrolekso/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json() as { puzzle: PuzzleRow };
  return json.puzzle;
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
