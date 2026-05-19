// POST /api/scores  — upsert a player's score for a puzzle
// GET  /api/scores?puzzleId=&deviceId= — top 20 + pinned player row
//
// RLS: anon INSERT + anon SELECT (open leaderboard).
// Score de-duplication: unique constraint on (device_id, puzzle_id).
// The client only sends scores when they increase, so an overwrite upsert is safe.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";

// ── POST ──────────────────────────────────────────────────────────────────────

interface ScorePayload {
  puzzle_id:    string;
  device_id:    string;
  display_name: string;
  score:        number;
}

export async function POST(req: NextRequest) {
  let body: ScorePayload;
  try {
    body = (await req.json()) as ScorePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { puzzle_id, device_id, display_name, score } = body;
  if (!puzzle_id || !device_id || typeof score !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  // Only allow date-scoped puzzle IDs (YYYY-MM-DD) — no custom puzzles on the leaderboard.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(puzzle_id)) {
    return NextResponse.json({ error: "Invalid puzzle_id format" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("scores") as any).upsert(
    {
      puzzle_id,
      device_id,
      display_name: (display_name ?? "").trim() || "Ανώνυμος",
      score,
    },
    { onConflict: "device_id,puzzle_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget cleanup: delete scores older than 7 days to keep the
  // leaderboard to a rolling window.  Never block the response for housekeeping.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void (supabase.from("scores") as any).delete().lt("puzzle_id", cutoffStr);

  return NextResponse.json({ ok: true });
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const puzzleId = req.nextUrl.searchParams.get("puzzleId");
  const deviceId = req.nextUrl.searchParams.get("deviceId") ?? "";

  if (!puzzleId) {
    return NextResponse.json({ error: "puzzleId is required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Fetch top 20 rows — strip device_id before returning to client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase.from("scores") as any)
    .select("device_id, display_name, score")
    .eq("puzzle_id", puzzleId)
    .order("score", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  interface RawRow { device_id: string; display_name: string; score: number; }
  const rawRows: RawRow[] = (rows as RawRow[]) ?? [];

  const top20 = rawRows.map((r, i) => ({
    rank:         i + 1,
    display_name: r.display_name,
    score:        r.score,
    isPlayer:     r.device_id === deviceId,
  }));

  // If the player is already in the top 20, no pinned row needed.
  const playerInTop20 = top20.some((r) => r.isPlayer);

  let playerRow: {
    rank:         number;
    display_name: string;
    score:        number;
    isPlayer:     true;
  } | null = null;

  if (!playerInTop20 && deviceId) {
    // Fetch the player's own row.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: playerData } = await (supabase.from("scores") as any)
      .select("display_name, score")
      .eq("puzzle_id", puzzleId)
      .eq("device_id", deviceId)
      .single();

    if (playerData) {
      // Count how many players have a strictly higher score → rank = count + 1.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase.from("scores") as any)
        .select("*", { count: "exact", head: true })
        .eq("puzzle_id", puzzleId)
        .gt("score", playerData.score as number);

      playerRow = {
        rank:         (count ?? 0) + 1,
        display_name: playerData.display_name as string,
        score:        playerData.score as number,
        isPlayer:     true,
      };
    }
  }

  return NextResponse.json({ top20, playerRow });
}
