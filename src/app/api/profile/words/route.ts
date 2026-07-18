// GET /api/profile/words?device_uuid= — per-length word-find counts for one device.
//
// Feeds the "Λέξεις ανά μήκος" profile card. The aggregation happens in Postgres:
// player_words_by_length(p_device_uuid) returns one { length, count } row per
// distinct length the device has found. This is deliberate — player_words is the
// fastest-growing fact table on the platform (~20–40 rows per player per day,
// append-forever), so fetching the rows to count them client-side would walk toward
// the Fluid-CPU envelope (soul.md). The RPC transfers a handful of aggregate rows
// instead, and its per-device scan is index-backed by the UNIQUE
// (device_uuid, puzzle_date, word) constraint. The function is invoker-rights: the
// open anon SELECT policy on player_words already authorizes the read.
//
// The route only folds the sparse aggregate into the fixed display buckets
// (bucketWordsByLength) — 4…9 individually plus a "10+" tail. Reading by
// device_uuid is fine: the response carries only counts, never the id back. The 60s
// private cache absorbs profile-page reloads.

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
  const { data, error } = await supabase.rpc("player_words_by_length", {
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
