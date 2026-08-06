// GET /api/profile/words?device_uuid= — per-length word-find counts for one device.
//
// Feeds the "Λέξεις ανά μήκος" profile card. The aggregation happens in Postgres:
// player_milestones_by_length(p_device_uuid) returns one { length, count } row per
// distinct length the device has found, reading `value` on the kind='word' rows.
// This is deliberate — milestones are append-forever, so fetching the rows to count
// them client-side would walk toward the Fluid-CPU envelope (soul.md). The RPC
// transfers a handful of aggregate rows instead, and its per-device scan is
// index-backed by the UNIQUE(device_uuid, puzzle_date, kind, detail) constraint's
// leading column. The function is invoker-rights: the open anon SELECT policy on
// player_milestones already authorizes the read.
//
// The route only folds the sparse aggregate into the fixed display buckets
// (bucketWordsByLength) — 10, 11, 12 individually plus a "13+" tail (only long words
// are tracked). Reading by device_uuid is fine: the response carries only counts,
// never the id back. The 60s private cache absorbs profile-page reloads.

import { NextResponse, type NextRequest } from "next/server";

import { jsonError, jsonMessage } from "@/lib/apiRoute";
import { getSupabaseClient } from "@/lib/supabase";
import { bucketWordsByLength, type WordLengthCount } from "@/lib/wordsByLength";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_uuid") ?? "";
  if (!deviceId) {
    return jsonMessage("device_uuid is required");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("player_milestones_by_length", {
    p_device_uuid: deviceId,
  });

  if (error) {
    return jsonError("db_error", error.message);
  }

  const result = bucketWordsByLength((data as WordLengthCount[]) ?? []);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
