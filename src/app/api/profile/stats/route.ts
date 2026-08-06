// GET /api/profile/stats?device_uuid= — lifetime stats for one device.
//
// Read-only aggregate over game_scores (RLS: anon SELECT is open), plus a parallel
// COUNT(*) over the separate player_pangrams table. Returns { total_points,
// puzzles_played, leksokipos_points, pangram_count }.
// Points and puzzle count are cross-game; leksokipos_points is leksokipos-only
// (see lifetimeStats); pangram_count is the size of the append-only
// pangram set (B2, ADR 0013 lane C).
//
// Caching / scale: both queries are device-scoped, so the row count grows with
// one player's history, not with the audience. The 60s private cache absorbs
// profile-page reloads.
//
// Reading by device_uuid is fine: it is the bearer of its own identity and the
// response carries only aggregates (never the id back).

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";
import { aggregateLifetimeStats, type LifetimeStatRow } from "@/lib/lifetimeStats";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_uuid") ?? "";
  if (!deviceId) {
    return jsonMessage("device_uuid is required");
  }

  const supabase = getSupabaseClient();
  const [scoresRes, pangramRes] = await Promise.all([
    table(supabase, "game_scores")
      .select("game_id, score")
      .eq("device_id", deviceId),
    table(supabase, "player_pangrams")
      .select("*", { count: "exact", head: true })
      .eq("device_uuid", deviceId),
  ]);

  if (scoresRes.error) {
    return jsonError("db_error", scoresRes.error.message);
  }
  if (pangramRes.error) {
    return jsonError("db_error", pangramRes.error.message);
  }

  const stats = aggregateLifetimeStats((scoresRes.data as LifetimeStatRow[]) ?? []);

  return NextResponse.json(
    {
      ...stats,
      pangram_count: pangramRes.count ?? 0,
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
