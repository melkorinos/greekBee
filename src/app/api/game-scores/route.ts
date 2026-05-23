// POST /api/game-scores — upsert a player's score for any game that uses game_scores
// GET  /api/game-scores?game_id=&puzzle_date=&deviceId= — top 20 + pinned player row
//
// Covers: Leksokipos (score = points, higher is better)
//         Leksindeseis (score = mistakesRemaining 1–4, higher is better)
//
// RLS: anon INSERT + anon SELECT + anon UPDATE (open leaderboard).
// Score de-duplication: unique constraint on (game_id, device_id, puzzle_date).
// The client only sends scores when they increase, so an overwrite upsert is safe.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { isISODate } from "@/games/leksokipos/lib";
import { upsertAndClean } from "@/lib/supabasePost";

export const runtime = "edge";

// ── POST ──────────────────────────────────────────────────────────────────────

interface ScorePayload {
  game_id:      string;
  puzzle_date:  string;
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

  const { game_id, puzzle_date: rawDate, device_id, display_name, score } = body;

  // Strip a trailing locale suffix (e.g. "2026-05-22-el" → "2026-05-22")
  const puzzle_date = rawDate?.replace(/-[a-z]{2}$/i, "") ?? "";

  if (!game_id || !puzzle_date || !device_id || typeof score !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isISODate(puzzle_date)) {
    return NextResponse.json({ error: "Invalid puzzle_date format" }, { status: 400 });
  }

  const err = await upsertAndClean(
    "game_scores",
    "game_id,device_id,puzzle_date",
    "puzzle_date",
    {
      game_id,
      puzzle_date,
      device_id,
      display_name: (display_name ?? "").trim() || "Ανώνυμος",
      score,
    },
  );
  if (err) return NextResponse.json({ error: err }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const gameId    = req.nextUrl.searchParams.get("game_id") ?? "";
  const puzzleDate = req.nextUrl.searchParams.get("puzzle_date") ?? "";
  const deviceId  = req.nextUrl.searchParams.get("deviceId") ?? "";

  if (!gameId || !puzzleDate) {
    return NextResponse.json({ error: "game_id and puzzle_date are required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase.from("game_scores") as any)
    .select("device_id, display_name, score")
    .eq("game_id", gameId)
    .eq("puzzle_date", puzzleDate)
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

  const playerInTop20 = top20.some((r) => r.isPlayer);

  let playerRow: {
    rank:         number;
    display_name: string;
    score:        number;
    isPlayer:     true;
  } | null = null;

  if (!playerInTop20 && deviceId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: playerData } = await (supabase.from("game_scores") as any)
      .select("display_name, score")
      .eq("game_id", gameId)
      .eq("puzzle_date", puzzleDate)
      .eq("device_id", deviceId)
      .single();

    if (playerData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase.from("game_scores") as any)
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("puzzle_date", puzzleDate)
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
