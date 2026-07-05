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

import { getSupabaseClient } from "@/lib/supabase";
import { ALL_ACHIEVEMENT_IDS } from "@/games/leksokipos/lib/achievements";

export const runtime = "edge";

// ── POST — earn ────────────────────────────────────────────────────────────────

interface EarnPayload {
  device_uuid:     string;
  achievement_ids: string[];
}

export async function POST(req: NextRequest) {
  let body: EarnPayload;
  try {
    body = (await req.json()) as EarnPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { device_uuid, achievement_ids } = body;

  if (!device_uuid || !Array.isArray(achievement_ids)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Keep only known, de-duped ids — unknown ids would be permanent junk in an
  // append-forever table. Nothing valid to write is a no-op, not an error.
  const ids = [...new Set(achievement_ids)].filter((id) => ALL_ACHIEVEMENT_IDS.has(id));
  if (ids.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const rows = ids.map((achievement_id) => ({ device_uuid, achievement_id }));

  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("player_achievements") as any).upsert(
    rows,
    { onConflict: "device_uuid,achievement_id", ignoreDuplicates: true },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── GET — earned ids for a device ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const device_uuid = req.nextUrl.searchParams.get("device_uuid") ?? "";

  if (!device_uuid) {
    return NextResponse.json({ error: "device_uuid is required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("player_achievements") as any)
    .select("achievement_id")
    .eq("device_uuid", device_uuid);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const earned = ((data as { achievement_id: string }[] | null) ?? []).map(
    (r) => r.achievement_id,
  );
  return NextResponse.json({ earned });
}
