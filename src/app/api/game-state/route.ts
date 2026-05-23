// POST /api/game-state — upsert a game state blob for cross-device sync
// GET  /api/game-state?device_uuid=&game_id=&puzzle_date= — fetch blob for restore
//
// The state blob (JSONB) holds the full Leksokipos session:
//   { foundWords: string[], score: number, currentInput: string }
//
// Uniqueness: (device_uuid, game_id, puzzle_date) — one blob per player per puzzle.
// Retention: 7-day rolling window via puzzle_date cleanup on every upsert.
// updated_at is set explicitly on every upsert (no DB trigger).

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { isISODate } from "@/games/leksokipos/lib";
import { upsertAndClean } from "@/lib/supabasePost";

export const runtime = "edge";

// ── POST — upsert state blob ──────────────────────────────────────────────────

interface UpsertStatePayload {
  device_uuid:  string;
  game_id:      string;
  puzzle_date:  string;
  state:        Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  let body: UpsertStatePayload;
  try {
    body = (await req.json()) as UpsertStatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { device_uuid, game_id, puzzle_date: rawDate, state } = body;

  const puzzle_date = rawDate?.replace(/-[a-z]{2}$/i, "") ?? "";

  if (!device_uuid || !game_id || !puzzle_date || !state || typeof state !== "object") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isISODate(puzzle_date)) {
    return NextResponse.json({ error: "Invalid puzzle_date format" }, { status: 400 });
  }

  const err = await upsertAndClean(
    "game_state",
    "device_uuid,game_id,puzzle_date",
    "puzzle_date",
    {
      device_uuid,
      game_id,
      puzzle_date,
      state,
      updated_at: new Date().toISOString(),
    },
  );

  if (err) return NextResponse.json({ error: err }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── GET — fetch state blob for restore ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const device_uuid = req.nextUrl.searchParams.get("device_uuid") ?? "";
  const game_id     = req.nextUrl.searchParams.get("game_id")     ?? "";
  const puzzle_date = req.nextUrl.searchParams.get("puzzle_date") ?? "";

  if (!device_uuid || !game_id || !puzzle_date) {
    return NextResponse.json(
      { error: "device_uuid, game_id, and puzzle_date are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("game_state") as any)
    .select("state")
    .eq("device_uuid", device_uuid)
    .eq("game_id", game_id)
    .eq("puzzle_date", puzzle_date)
    .single();

  if (error) {
    // PostgREST returns error code PGRST116 when .single() finds no rows.
    if ((error as { code?: string }).code === "PGRST116") {
      return NextResponse.json({ state: null });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ state: (data as { state: unknown }).state });
}
