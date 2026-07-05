// POST /api/profile  — create or update a cross-device profile (upsert by device_uuid)
// GET  /api/profile?device_uuid= — existence check (startup profile verification)
//
// Identity model: the client supplies its own device_uuid (= the existing
// anonymous deviceId). No PIN — cross-device transfer uses the separate
// /api/transfer flow instead. See docs/adr/ for the identity rationale.
//
// RLS: anon INSERT + anon SELECT + anon UPDATE (open profiles table).
// device_uuid is the stable profile identifier; has a UNIQUE constraint.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient, getTokenScopedClient } from "@/lib/supabase";

export const runtime = "edge";

// ── POST — create / update profile ───────────────────────────────────────────

interface CreateProfilePayload {
  display_name: string;
  device_uuid:  string;
}

export async function POST(req: NextRequest) {
  let body: CreateProfilePayload;
  try {
    body = (await req.json()) as CreateProfilePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { display_name: rawName, device_uuid } = body;

  if (!device_uuid) {
    return NextResponse.json({ error: "device_uuid is required" }, { status: 400 });
  }

  const display_name = (rawName ?? "").trim() || "Ανώνυμος";

  // A signed-in player's player_profiles row has auth_user_id set, and the
  // profile_update RLS policy scopes writes to auth.uid(). Carry the caller's
  // access token (when present) so RLS sees them as the row owner; anonymous
  // callers use the anon client, which the policy still allows for auth_user_id
  // IS NULL rows. RLS stays authoritative either way — an anon client cannot
  // rename an auth-linked profile, and a token can only touch its owner's row.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  const supabase   = token ? getTokenScopedClient(token) : getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("player_profiles") as any).upsert(
    { display_name, device_uuid, last_active: new Date().toISOString() },
    { onConflict: "device_uuid" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Propagate the rename to the leaderboard. Display names are denormalized onto
  // each game_scores row (the leaderboard GET reads display_name there, never
  // from player_profiles), so without this fan-out the player's existing rows
  // keep the stale name. anon UPDATE is permitted (scores_update USING(true),
  // ADR 0012). No-op for a brand-new device with no scores yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: scoresError } = await (supabase.from("game_scores") as any)
    .update({ display_name })
    .eq("device_id", device_uuid);

  if (scoresError) {
    return NextResponse.json({ error: scoresError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── GET — existence check by device_uuid (startup profile verification) ──────

export async function GET(req: NextRequest) {
  const deviceUuid = req.nextUrl.searchParams.get("device_uuid") ?? "";

  if (!deviceUuid) {
    return NextResponse.json({ error: "device_uuid is required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("player_profiles") as any)
    .select("device_uuid")
    .eq("device_uuid", deviceUuid)
    .single();

  if (error && error.message !== "JSON object requested, multiple (or no) rows returned") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exists: data !== null });
}
