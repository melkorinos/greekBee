// GET /api/profile/stats?device_uuid= — lifetime stats for one device.
//
// Read-only aggregate over game_scores (RLS: anon SELECT is open), plus a parallel
// COUNT(*) over the separate player_pangrams table. Returns { total_points,
// puzzles_played, tzimani_count, leksokipos_points, pangram_count }. Points and
// puzzle count are cross-game; Τζιμάνι and leksokipos_points are leksokipos-only
// (see lifetimeStats); pangram_count is the size of the append-only pangram set
// (B2, ADR 0013 lane C) — a route-level sibling query, NOT part of the game_scores
// reduce. The device's game_scores row set is small (one row per game/day) so we
// fetch and reduce in JS — no RPC; the pangram count is HEAD-only (no rows moved).
//
// Reading by device_uuid is fine: it is the bearer of its own identity and the
// response carries only aggregates (never the id back). No cache needed at this
// scale; a short private cache is a courtesy.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { aggregateLifetimeStats, type LifetimeStatRow } from "@/lib/lifetimeStats";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_uuid") ?? "";
  if (!deviceId) {
    return NextResponse.json({ error: "device_uuid is required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const [scoresRes, pangramRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("game_scores") as any)
      .select("game_id, score, is_perfect")
      .eq("device_id", deviceId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("player_pangrams") as any)
      .select("*", { count: "exact", head: true })
      .eq("device_uuid", deviceId),
  ]);

  if (scoresRes.error) {
    return NextResponse.json({ error: scoresRes.error.message }, { status: 500 });
  }
  if (pangramRes.error) {
    return NextResponse.json({ error: pangramRes.error.message }, { status: 500 });
  }

  const stats = aggregateLifetimeStats((scoresRes.data as LifetimeStatRow[]) ?? []);

  return NextResponse.json(
    { ...stats, pangram_count: pangramRes.count ?? 0 },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
