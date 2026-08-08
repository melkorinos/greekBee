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

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, getTokenScopedClient, table } from "@/lib/supabase";

export const runtime = "edge";

// ── POST — create / update profile ───────────────────────────────────────────

interface CreateProfilePayload {
  display_name: string;
  device_uuid:  string;
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson<CreateProfilePayload>(req);
  if (!parsed.ok) return parsed.response;

  const { display_name: rawName, device_uuid } = parsed.body;

  if (!device_uuid) {
    return jsonMessage("device_uuid is required");
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

  const { error } = await table(supabase, "player_profiles").upsert(
    { display_name, device_uuid, last_active: new Date().toISOString() },
    { onConflict: "device_uuid" }
  );

  if (error) {
    return jsonError("db_error", error.message);
  }

  // Propagate the rename to the leaderboard. Display names are denormalized onto
  // each game_scores row (the leaderboard GET reads display_name there, never
  // from player_profiles), so without this fan-out the player's existing rows
  // keep the stale name. anon UPDATE is permitted (scores_update USING(true),
  // ADR 0012). No-op for a brand-new device with no scores yet.
  const { error: scoresError } = await table(supabase, "game_scores")
    .update({ display_name })
    .eq("device_id", device_uuid);

  if (scoresError) {
    return jsonError("db_error", scoresError.message);
  }

  return NextResponse.json({ ok: true });
}

// ── GET — existence check by device_uuid (startup profile verification) ──────

export async function GET(req: NextRequest) {
  const deviceUuid = req.nextUrl.searchParams.get("device_uuid") ?? "";

  if (!deviceUuid) {
    return jsonMessage("device_uuid is required");
  }

  const supabase = getSupabaseClient();

  const { data, error } = await table(supabase, "player_profiles")
    .select("device_uuid")
    .eq("device_uuid", deviceUuid)
    .single();

  if (error && error.message !== "JSON object requested, multiple (or no) rows returned") {
    return jsonError("db_error", error.message);
  }

  return NextResponse.json({ exists: data !== null });
}
