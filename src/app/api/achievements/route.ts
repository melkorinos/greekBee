// POST /api/achievements — earn one or more achievements for a device (insert-if-absent)
// GET  /api/achievements?device_uuid= — the achievement_ids this device has earned
//
// Storage = immutable fact rows (ADR 0013). Earning is INSERT ... ON CONFLICT
// (device_uuid, achievement_id) DO NOTHING — modelled via supabase upsert with
// ignoreDuplicates: true — so an already-earned badge is never clobbered and its
// earned_at is preserved. The server runs ZERO detection; it only writes the ids
// the client posts, guarded by an id whitelist so junk can't reach the (append-
// forever) table. Open RLS mirrors game_state's anon access.

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";
import { ALL_ACHIEVEMENT_IDS } from "@/games/leksokipos/lib/achievements";

export const runtime = "edge";

// ── POST — earn ────────────────────────────────────────────────────────────────

interface EarnPayload {
  device_uuid:     string;
  achievement_ids: string[];
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson<EarnPayload>(req);
  if (!parsed.ok) return parsed.response;

  const { device_uuid, achievement_ids } = parsed.body;

  if (!device_uuid || !Array.isArray(achievement_ids)) {
    return jsonMessage("Missing required fields");
  }

  // Keep only known, de-duped ids — unknown ids would be permanent junk in an
  // append-forever table. Nothing valid to write is a no-op, not an error.
  const ids = [...new Set(achievement_ids)].filter((id) => ALL_ACHIEVEMENT_IDS.has(id));
  if (ids.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const rows = ids.map((achievement_id) => ({ device_uuid, achievement_id }));

  const supabase = getSupabaseClient();
  const { error } = await table(supabase, "player_achievements").upsert(
    rows,
    { onConflict: "device_uuid,achievement_id", ignoreDuplicates: true },
  );

  if (error) return jsonError("db_error", error.message);
  return NextResponse.json({ ok: true });
}

// ── GET — earned ids for a device ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const device_uuid = req.nextUrl.searchParams.get("device_uuid") ?? "";

  if (!device_uuid) {
    return jsonMessage("device_uuid is required");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await table(supabase, "player_achievements")
    .select("achievement_id")
    .eq("device_uuid", device_uuid);

  if (error) return jsonError("db_error", error.message);

  const earned = ((data as { achievement_id: string }[] | null) ?? []).map(
    (r) => r.achievement_id,
  );
  return NextResponse.json({ earned });
}
