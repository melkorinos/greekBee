// POST /api/transfer/claim — claim a transfer code on a new device.
//
// Validates the code (exists, not used, not expired), marks it used,
// and returns the source device_uuid + display_name so the new device
// can adopt that identity.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "edge";

interface TransferCodeRow {
  device_uuid: string;
  expires_at:  string;
  used:        boolean;
}

export async function POST(req: NextRequest) {
  let body: { code: string };
  try {
    body = (await req.json()) as { code: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: lookupErr } = await (supabase.from("transfer_codes") as any)
    .select("device_uuid, expires_at, used")
    .eq("code", code)
    .single();

  if (lookupErr || !row) {
    return NextResponse.json({ error: "Ο κωδικός δεν βρέθηκε." }, { status: 404 });
  }

  const { device_uuid, expires_at, used } = row as TransferCodeRow;

  if (used) {
    return NextResponse.json({ error: "Ο κωδικός έχει ήδη χρησιμοποιηθεί." }, { status: 410 });
  }
  if (new Date(expires_at) < new Date()) {
    return NextResponse.json({ error: "Ο κωδικός έχει λήξει." }, { status: 410 });
  }

  // Mark used
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("transfer_codes") as any).update({ used: true }).eq("code", code);

  // Fetch display_name from the profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("player_profiles") as any)
    .select("display_name")
    .eq("device_uuid", device_uuid)
    .single();

  return NextResponse.json({
    device_uuid,
    display_name: (profile as { display_name?: string } | null)?.display_name ?? "",
  });
}
