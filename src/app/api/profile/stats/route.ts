// GET /api/profile/stats?device_uuid= — lifetime stats for one device.
//
// Read-only aggregate over game_scores (RLS: anon SELECT is open), plus one
// GROUP BY kind over player_milestones. Returns { total_points, puzzles_played,
// leksokipos_points, pangram_count, top_rank_count, tzimani_count }.
// Points and puzzle count are cross-game; leksokipos_points is leksokipos-only
// (see lifetimeStats); the three counts are the sizes of the append-only milestone
// sets the tiered badges read their progress from (ADR 0013).
//
// The milestone read is ONE aggregate call, not one count per kind: this route
// gained two badge-bearing kinds without gaining a round-trip, which is the whole
// reason player_milestone_counts exists. `word` is deliberately not surfaced — its
// only reader is the per-length card, which needs the length breakdown, not a total.
//
// Caching / scale: both queries are device-scoped, so the row count grows with
// one player's history, not with the audience. Neither transfers row data. The 60s
// private cache absorbs profile-page reloads.
//
// Reading by device_uuid is fine: it is the bearer of its own identity and the
// response carries only aggregates (never the id back).

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";
import { aggregateLifetimeStats, type LifetimeStatRow } from "@/lib/lifetimeStats";

export const runtime = "edge";

/** One row of the player_milestone_counts aggregate. */
interface KindCount {
  kind:  string;
  count: number;
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_uuid") ?? "";
  if (!deviceId) {
    return jsonMessage("device_uuid is required");
  }

  const supabase = getSupabaseClient();
  const [scoresRes, milestoneRes] = await Promise.all([
    table(supabase, "game_scores")
      .select("game_id, score")
      .eq("device_id", deviceId),
    supabase.rpc("player_milestone_counts", { p_device_uuid: deviceId }),
  ]);

  if (scoresRes.error) {
    return jsonError("db_error", scoresRes.error.message);
  }
  if (milestoneRes.error) {
    return jsonError("db_error", milestoneRes.error.message);
  }

  const stats = aggregateLifetimeStats((scoresRes.data as LifetimeStatRow[]) ?? []);

  // A kind with no rows is simply absent from the aggregate — read it as 0 so a
  // player with no milestones still gets every progress denominator.
  const counts = new Map(((milestoneRes.data as KindCount[]) ?? []).map((r) => [r.kind, r.count]));

  return NextResponse.json(
    {
      ...stats,
      pangram_count:  counts.get("pangram")  ?? 0,
      top_rank_count: counts.get("top_rank") ?? 0,
      tzimani_count:  counts.get("tzimani")  ?? 0,
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
