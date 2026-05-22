// POST /api/connections-scores — upsert a player's score for a Connections puzzle
// GET  /api/connections-scores?date=YYYY-MM-DD&deviceId= — top 20 + pinned player row
//
// Score = mistakesRemaining (1–4) at the moment the player wins.
// Higher score = better (4 = perfect, no mistakes).
// Only winning scores are ever submitted — lost games never appear.
//
// ⚠️  Requires a `connections_scores` table in Supabase. Run once in the dashboard:
//
//   create table connections_scores (
//     id           bigserial primary key,
//     puzzle_date  text    not null,
//     device_id    text    not null,
//     display_name text    not null default 'Ανώνυμος',
//     score        integer not null,
//     constraint connections_scores_device_date_unique
//       unique (device_id, puzzle_date)
//   );
//   alter table connections_scores enable row level security;
//   create policy "anon insert" on connections_scores for insert to anon with check (true);
//   create policy "anon select" on connections_scores for select to anon using (true);
//   create policy "anon update" on connections_scores for update to anon using (true);

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { isISODate } from "@/games/spelling-bee/lib";
import { upsertAndClean } from "@/lib/supabasePost";

export const runtime = "edge";

// ── POST ──────────────────────────────────────────────────────────────────────

interface ScorePayload {
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

  const { puzzle_date, device_id, display_name, score } = body;
  if (!puzzle_date || !device_id || typeof score !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isISODate(puzzle_date)) {
    return NextResponse.json({ error: "Invalid puzzle_date format" }, { status: 400 });
  }
  if (score < 1 || score > 4) {
    return NextResponse.json({ error: "score must be 1–4" }, { status: 400 });
  }

  const err = await upsertAndClean(
    "connections_scores",
    "device_id,puzzle_date",
    "puzzle_date",
    {
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
  const date     = req.nextUrl.searchParams.get("date") ?? "";
  const deviceId = req.nextUrl.searchParams.get("deviceId") ?? "";

  if (!date || !isISODate(date)) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase.from("connections_scores") as any)
    .select("device_id, display_name, score")
    .eq("puzzle_date", date)
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
    const { data: playerData } = await (supabase.from("connections_scores") as any)
      .select("display_name, score")
      .eq("puzzle_date", date)
      .eq("device_id", deviceId)
      .single();

    if (playerData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase.from("connections_scores") as any)
        .select("*", { count: "exact", head: true })
        .eq("puzzle_date", date)
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
