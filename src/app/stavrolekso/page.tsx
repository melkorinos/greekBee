import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
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
  try {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("community_stavrolekso_puzzles") as any)
      .select("id, title, submitter_name, data, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as PuzzleRow[];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function StavroleksoLandingPage() {
  const puzzles = await getApprovedPuzzles();

  return (
    <main className="flex flex-col items-center min-h-screen bg-background px-4 py-6">
      <div className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">♟️ Stavrolekso</h1>
          <p className="text-sm text-muted mt-1">Λύσε σταυρόλεξα της κοινότητας.</p>
        </div>

        {puzzles.length === 0 ? (
          <p className="text-sm text-muted text-center py-12">
            Δεν υπάρχουν διαθέσιμα παζλ ακόμα.
          </p>
        ) : (
          <div className="space-y-3">
            {puzzles.map((puzzle) => (
              <Link
                key={puzzle.id}
                href={`/stavrolekso/${puzzle.id}`}
                className="block border border-border rounded-xl p-4 hover:bg-surface-raised transition-colors"
              >
                <p className="font-semibold text-foreground text-sm">
                  {puzzle.title ?? `Stavrolekso #${puzzle.id}`}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {puzzle.data.width}×{puzzle.data.height} · {formatDate(puzzle.created_at)}
                  {puzzle.submitter_name && ` · από ${puzzle.submitter_name}`}
                </p>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/stavrolekso/maker"
          className="block text-center text-sm font-semibold text-muted hover:text-foreground transition-colors py-2"
        >
          Δημιούργησε το δικό σου σταυρόλεξο →
        </Link>
      </div>
    </main>
  );
}
