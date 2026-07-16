// POST /api/transfer/claim — claim a transfer code on a new device.
//
// Validates the code (exists, not used, not expired), marks it used,
// and returns the source device_uuid + display_name so the new device
// can adopt that identity.
//
// The `error` strings here are player-facing copy, not codes: useProfile's
// claimTransferCode throws `err.error` and the UI renders it verbatim. They go
// out through jsonMessage — the envelope's message channel — precisely so a
// later pass at "stop leaking implementation detail" cannot quietly replace
// them with `db_error` and blank the player's explanation.

import { NextRequest, NextResponse } from "next/server";
import { jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";

export const runtime = "edge";

interface TransferCodeRow {
  device_uuid: string;
  expires_at:  string;
  used:        boolean;
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson<{ code: string }>(req);
  if (!parsed.ok) return parsed.response;

  const code = (parsed.body.code ?? "").trim().toUpperCase();
  if (!code) {
    return jsonMessage("code is required");
  }

  const supabase = getSupabaseClient();

  const { data: row, error: lookupErr } = await table(supabase, "transfer_codes")
    .select("device_uuid, expires_at, used")
    .eq("code", code)
    .single();

  if (lookupErr || !row) {
    return jsonMessage("Ο κωδικός δεν βρέθηκε.", 404);
  }

  const { device_uuid, expires_at, used } = row as TransferCodeRow;

  if (used) {
    return jsonMessage("Ο κωδικός έχει ήδη χρησιμοποιηθεί.", 410);
  }
  if (new Date(expires_at) < new Date()) {
    return jsonMessage("Ο κωδικός έχει λήξει.", 410);
  }

  // Mark used
  await table(supabase, "transfer_codes").update({ used: true }).eq("code", code);

  // Fetch display_name from the profile
  const { data: profile } = await table(supabase, "player_profiles")
    .select("display_name")
    .eq("device_uuid", device_uuid)
    .single();

  return NextResponse.json({
    device_uuid,
    display_name: (profile as { display_name?: string } | null)?.display_name ?? "",
  });
}
