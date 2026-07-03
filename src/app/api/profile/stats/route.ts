// GET /api/profile/stats?device_uuid= — lifetime stats for one device.
//
// Read-only aggregate over game_scores (RLS: anon SELECT is open). Returns
// { total_points, puzzles_played, tzimani_count }. Points and puzzle count are
// cross-game; Τζιμάνι is leksokipos-only (see lifetimeStats). The device's row
// set is small (one row per game/day) so we fetch and reduce in JS — no RPC.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase.from("game_scores") as any)
    .select("game_id, score, is_perfect")
    .eq("device_id", deviceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stats = aggregateLifetimeStats((rows as LifetimeStatRow[]) ?? []);

  return NextResponse.json(stats, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
