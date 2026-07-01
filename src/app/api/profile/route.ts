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

import { getSupabaseClient } from "@/lib/supabase";

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
  const supabase     = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("player_profiles") as any).upsert(
    { display_name, device_uuid, last_active: new Date().toISOString() },
    { onConflict: "device_uuid" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
