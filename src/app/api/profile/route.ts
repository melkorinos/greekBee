// POST /api/profile  — create a cross-device profile
// GET  /api/profile?name=&pin= — look up profiles by display name + PIN
//
// Identity model: the client supplies its own device_uuid (= the existing
// anonymous deviceId). The server never generates a UUID — it only generates
// the 4-digit PIN. See handoff-phase4.md for the full identity rationale.
//
// RLS: anon INSERT + anon SELECT + anon UPDATE (open profiles table).
// (name, pin) is NOT unique — multiple rows can share the same pair.
// device_uuid is the stable profile identifier; never updated after creation.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "edge";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a zero-padded 4-digit PIN string, e.g. "0419". */
function generatePin(): string {
  return Math.floor(Math.random() * 10_000)
    .toString()
    .padStart(4, "0");
}

// ── POST — create profile ─────────────────────────────────────────────────────

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
  const pin          = generatePin();
  const supabase     = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("player_profiles") as any).insert({
    display_name,
    pin,
    device_uuid,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pin });
}

// ── GET — look up profiles by name + PIN ──────────────────────────────────────

export interface ProfileMatch {
  device_uuid:  string;
  display_name: string;
  created_at:   string;
  last_active:  string;
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const pin  = req.nextUrl.searchParams.get("pin")  ?? "";

  if (!name || !pin) {
    return NextResponse.json({ error: "name and pin are required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("player_profiles") as any)
    .select("device_uuid, display_name, created_at, last_active")
    .eq("display_name", name)
    .eq("pin", pin)
    .order("last_active", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profiles: ProfileMatch[] = (data ?? []) as ProfileMatch[];
  return NextResponse.json({ profiles });
}
