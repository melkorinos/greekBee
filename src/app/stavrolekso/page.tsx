import Link from "next/link";
import type { StavroleksoPuzzleData } from "@/games/stavrolekso/types";

export const dynamic = "force-dynamic";

interface PuzzleRow {
  id: number;
  title: string | null;
  submitter_name: string;
  data: StavroleksoPuzzleData;
  created_at: string;
}

async function getApprovedPuzzles(): Promise<PuzzleRow[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res  = await fetch(`${base}/api/community-puzzles/stavrolekso?status=approved`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json() as { puzzles: PuzzleRow[] };
  return json.puzzles ?? [];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function StavroleksoLandingPage() {
  const puzzles = await getApprovedPuzzles();

  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 dark:bg-stone-950 px-4 py-6">
      <div className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">♟️ Stavrolekso</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Λύσε σταυρόλεξα της κοινότητας.</p>
        </div>

        {puzzles.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-12">
            Δεν υπάρχουν διαθέσιμα παζλ ακόμα.
          </p>
        ) : (
          <div className="space-y-3">
            {puzzles.map((puzzle) => (
              <Link
                key={puzzle.id}
                href={`/stavrolekso/${puzzle.id}`}
                className="block border border-stone-200 dark:border-stone-700 rounded-xl p-4 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">
                  {puzzle.title ?? `Stavrolekso #${puzzle.id}`}
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                  {puzzle.data.width}×{puzzle.data.height} · {formatDate(puzzle.created_at)}
                  {puzzle.submitter_name && ` · από ${puzzle.submitter_name}`}
                </p>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/stavrolekso/maker"
          className="block text-center text-sm font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-stone-100 transition-colors py-2"
        >
          Δημιούργησε το δικό σου σταυρόλεξο →
        </Link>
      </div>
    </main>
  );
}
