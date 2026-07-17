// GET /api/profile/stats?device_uuid= — lifetime stats for one device.
//
// Read-only aggregate over game_scores (RLS: anon SELECT is open), plus a parallel
// COUNT(*) over the separate player_pangrams table and a cross-device Leksokipos
// fetch for the first-place-finish count. Returns { total_points, puzzles_played,
// tzimani_count, leksokipos_points, pangram_count, leksokipos_first_place_count }.
// Points and puzzle count are cross-game; Τζιμάνι and leksokipos_points are
// leksokipos-only (see lifetimeStats); pangram_count is the size of the append-only
// pangram set (B2, ADR 0013 lane C). first_place_count is DERIVED from game_scores
// (data-class 2), never stored: "was I the day's top Leksokipos score?" needs
// everyone's rows for those dates, not just this device's, so it is a sibling
// query + a pure reduce (countFirstPlaceFinishes), NOT part of the device-scoped
// aggregateLifetimeStats reduce.
//
// Caching / scale: the first-place query fetches ALL Leksokipos rows (one per
// device per day), index-backed by game_scores_game_date_score_idx (game_id
// prefix). Bounded and cheap at current scale (hundreds of rows); the 60s private
// cache absorbs profile-page reloads. If Leksokipos rows ever approach the >10k
// Fluid-CPU threshold (soul.md), push the daily-MAX aggregation into a Postgres
// RPC/view that returns one row per puzzle_date instead of fetching the set.
//
// Reading by device_uuid is fine: it is the bearer of its own identity and the
// response carries only aggregates (never the id back).

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";
import { aggregateLifetimeStats, type LifetimeStatRow } from "@/lib/lifetimeStats";
import { countFirstPlaceFinishes, type PlacementRow } from "@/lib/placement";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_uuid") ?? "";
  if (!deviceId) {
    return jsonMessage("device_uuid is required");
  }

  const supabase = getSupabaseClient();
  const [scoresRes, pangramRes, leksokiposRes] = await Promise.all([
    table(supabase, "game_scores")
      .select("game_id, score, is_perfect")
      .eq("device_id", deviceId),
    table(supabase, "player_pangrams")
      .select("*", { count: "exact", head: true })
      .eq("device_uuid", deviceId),
    // Cross-device: all Leksokipos rows, to find each day's top score.
    table(supabase, "game_scores")
      .select("device_id, puzzle_date, score")
      .eq("game_id", "leksokipos"),
  ]);

  if (scoresRes.error) {
    return jsonError("db_error", scoresRes.error.message);
  }
  if (pangramRes.error) {
    return jsonError("db_error", pangramRes.error.message);
  }
  if (leksokiposRes.error) {
    return jsonError("db_error", leksokiposRes.error.message);
  }

  const stats = aggregateLifetimeStats((scoresRes.data as LifetimeStatRow[]) ?? []);
  const leksokipos_first_place_count = countFirstPlaceFinishes(
    (leksokiposRes.data as PlacementRow[]) ?? [],
    deviceId,
  );

  return NextResponse.json(
    { ...stats, pangram_count: pangramRes.count ?? 0, leksokipos_first_place_count },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
