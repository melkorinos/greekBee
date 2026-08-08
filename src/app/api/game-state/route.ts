// POST /api/game-state — upsert a game state blob for cross-device sync
// GET  /api/game-state?device_uuid=&game_id=&puzzle_date= — fetch blob for restore
//
// The state blob (JSONB) holds the full Leksokipos session:
//   { foundWords: string[], score: number, currentInput: string }
//
// Uniqueness: (device_uuid, game_id, puzzle_date) — one blob per player per puzzle.
// Retention: 7-day rolling window via the daily Vercel Cron at /api/cleanup-scores.
// updated_at is set explicitly on every upsert (no DB trigger).

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, table, type Json } from "@/lib/supabase";
import { upsertAndClean } from "@/lib/supabasePost";
import { isISODate, normalizePuzzleDate } from "@/lib/puzzleDate";

export const runtime = "edge";

// ── POST — upsert state blob ──────────────────────────────────────────────────

interface UpsertStatePayload {
  device_uuid:  string;
  game_id:      string;
  puzzle_date:  string;
  state:        Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson<UpsertStatePayload>(req);
  if (!parsed.ok) return parsed.response;

  const { device_uuid, game_id, puzzle_date: rawDate, state } = parsed.body;

  const puzzle_date = normalizePuzzleDate(rawDate);

  if (!device_uuid || !game_id || !puzzle_date || !state || typeof state !== "object") {
    return jsonMessage("Missing required fields");
  }
  if (!isISODate(puzzle_date)) {
    return jsonMessage("Invalid puzzle_date format");
  }

  const err = await upsertAndClean(
    "game_state",
    "device_uuid,game_id,puzzle_date",
    {
      device_uuid,
      game_id,
      puzzle_date,
      // Each game owns its own state shape; the column is jsonb, so the DB
      // types it only as Json. The payload is guarded above (object, non-null).
      state: state as Json,
      updated_at: new Date().toISOString(),
    },
  );

  if (err) return jsonError("db_error", err);
  return NextResponse.json({ ok: true });
}

// ── GET — fetch state blob for restore ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const device_uuid = req.nextUrl.searchParams.get("device_uuid") ?? "";
  const game_id     = req.nextUrl.searchParams.get("game_id")     ?? "";
  const puzzle_date = req.nextUrl.searchParams.get("puzzle_date") ?? "";

  if (!device_uuid || !game_id || !puzzle_date) {
    return jsonMessage("device_uuid, game_id, and puzzle_date are required");
  }

  const supabase = getSupabaseClient();

  const { data, error } = await table(supabase, "game_state")
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
    return jsonError("db_error", error.message);
  }

  return NextResponse.json({ state: (data as { state: unknown }).state });
}
