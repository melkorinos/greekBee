// POST /api/auth/link — links a DeviceId to a Google auth_user_id after OAuth sign-in.
//
// On first sign-in:
//   1. Upserts player_profiles: sets auth_user_id on the existing device row.
//      If no profile row exists yet, creates one.
//   2. Pre-populates display_name from Google if the player has none set.
//   3. Back-fills game_scores: sets auth_user_id on all rows belonging to this device.
//
// Idempotent — safe to call on every sign-in (no duplicate work if already linked).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "edge";

interface LinkPayload {
  device_uuid:  string;
  auth_user_id: string;
  display_name: string | null;
}

export async function POST(req: NextRequest) {
  let body: LinkPayload;
  try {
    body = (await req.json()) as LinkPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { device_uuid, auth_user_id, display_name: googleName } = body;

  if (!device_uuid || !auth_user_id) {
    return NextResponse.json({ error: "device_uuid and auth_user_id are required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase.from as any;

  // 1. Fetch existing profile to check if display_name is already set.
  const { data: existing } = await db("player_profiles")
    .select("display_name")
    .eq("device_uuid", device_uuid)
    .maybeSingle() as { data: { display_name: string } | null };

  // Use Google name only when player has no name yet.
  const nameToUse =
    existing?.display_name?.trim()
      ? existing.display_name
      : (googleName?.trim() || "Ανώνυμος");

  // 2. Upsert profile row — set auth_user_id + ensure display_name is populated.
  const { error: profileError } = await db("player_profiles").upsert(
    { device_uuid, auth_user_id, display_name: nameToUse },
    { onConflict: "device_uuid" }
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 3. Back-fill auth_user_id onto all existing game_scores for this device.
  const { error: scoresError } = await db("game_scores")
    .update({ auth_user_id })
    .eq("device_uuid", device_uuid)
    .is("auth_user_id", null);

  if (scoresError) {
    // Non-fatal — leaderboard still works via device_uuid; log and continue.
    console.error("game_scores back-fill error:", scoresError.message);
  }

  return NextResponse.json({ ok: true });
}
