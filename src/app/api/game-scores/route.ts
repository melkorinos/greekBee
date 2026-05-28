// POST /api/game-scores — upsert a player's score for any game that uses game_scores
// GET  /api/game-scores?game_id=&puzzle_date=&deviceId= — top 20 + pinned player row
//
// Covers:
//   Leksokipos   (score = points, higher is better)
//   Leksindeseis (score = mistakesRemaining 1–4, higher is better)
//   Leksiarxeio  (score = sum of per-length in-game points 0–30, higher is better)
//                 POST carries word_length + points; route does a read-modify-write
//                 so each length result is merged into one row per player per day.
//
// RLS: anon INSERT + anon SELECT + anon UPDATE (open leaderboard).
// Score de-duplication: unique constraint on (game_id, device_id, puzzle_date).

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { isISODate } from "@/games/leksokipos/lib";
import { upsertAndClean } from "@/lib/supabasePost";

export const runtime = "edge";

const LEKSIARXEIO_LENGTHS = new Set([4, 5, 6, 7, 8]);

// ── POST ──────────────────────────────────────────────────────────────────────

interface StandardScorePayload {
  game_id:      string;
  puzzle_date:  string;
  device_id:    string;
  display_name: string;
  score:        number;
}

interface LeksiarxeioScorePayload {
  game_id:      "leksiarxeio";
  puzzle_date:  string;
  word_length:  number;
  device_id:    string;
  display_name: string;
  points:       number;
}

type ScorePayload = StandardScorePayload | LeksiarxeioScorePayload;

function aggregateLeksiarxeioScore(data: Record<string, number>): number {
  return Object.values(data).reduce((sum, v) => sum + v, 0);
}

export async function POST(req: NextRequest) {
  let body: ScorePayload;
  try {
    body = (await req.json()) as ScorePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { game_id, puzzle_date: rawDate, device_id, display_name } = body;

  // Strip a trailing locale suffix (e.g. "2026-05-22-el" → "2026-05-22")
  const puzzle_date = rawDate?.replace(/-[a-z]{2}$/i, "") ?? "";

  if (!game_id || !puzzle_date || !device_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isISODate(puzzle_date)) {
    return NextResponse.json({ error: "Invalid puzzle_date format" }, { status: 400 });
  }

  const name = (display_name ?? "").trim() || "Ανώνυμος";

  // ── Leksiarxeio: read-modify-write one length at a time ────────────────────
  if (game_id === "leksiarxeio") {
    const { word_length, points } = body as LeksiarxeioScorePayload;
    if (!LEKSIARXEIO_LENGTHS.has(word_length)) {
      return NextResponse.json({ error: "Invalid word_length" }, { status: 400 });
    }
    if (typeof points !== "number" || points < 0 || points > 6) {
      return NextResponse.json({ error: "points must be 0–6" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from("game_scores") as any)
      .select("data")
      .eq("game_id", "leksiarxeio")
      .eq("device_id", device_id)
      .eq("puzzle_date", puzzle_date)
      .single();

    const existingData: Record<string, number> =
      (existing as { data: Record<string, number> } | null)?.data ?? {};
    const newData  = { ...existingData, [String(word_length)]: points };
    const newScore = aggregateLeksiarxeioScore(newData);

    const err = await upsertAndClean(
      "game_scores",
      "game_id,device_id,puzzle_date",
      "puzzle_date",
      { game_id, puzzle_date, device_id, display_name: name, score: newScore, data: newData },
    );
    if (err) return NextResponse.json({ error: err }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Standard games ──────────────────────────────────────────────────────────
  const { score } = body as StandardScorePayload;
  if (typeof score !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const err = await upsertAndClean(
    "game_scores",
    "game_id,device_id,puzzle_date",
    "puzzle_date",
    { game_id, puzzle_date, device_id, display_name: name, score },
  );
  if (err) return NextResponse.json({ error: err }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const gameId    = req.nextUrl.searchParams.get("game_id") ?? "";
  const puzzleDate = req.nextUrl.searchParams.get("puzzle_date") ?? "";
  const deviceId  = req.nextUrl.searchParams.get("deviceId") ?? "";
  // sort=asc for games where lower score is better (e.g. vrestifrasi attempt count)
  const sortAsc   = req.nextUrl.searchParams.get("sort") === "asc";

  if (!gameId || !puzzleDate) {
    return NextResponse.json({ error: "game_id and puzzle_date are required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase.from("game_scores") as any)
    .select("device_id, display_name, score")
    .eq("game_id", gameId)
    .eq("puzzle_date", puzzleDate)
    .order("score", { ascending: sortAsc })
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
      // Count players who rank ahead of this player.
      // For ascending sort (lower=better), count those with a lower score.
      // For descending sort (higher=better), count those with a higher score.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase.from("game_scores") as any)
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("puzzle_date", puzzleDate)
        [sortAsc ? "lt" : "gt"]("score", playerData.score as number);

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
