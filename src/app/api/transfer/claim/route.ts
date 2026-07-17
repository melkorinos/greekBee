// POST /api/transfer/claim — claim a transfer code on a new device.
//
// The claim is atomic: a single conditional UPDATE marks the code used and
// returns the row, so two devices racing on the same code cannot both win —
// single-use is enforced by the write itself, not a check that precedes it.
// Only when the UPDATE matches nothing do we look the row up, purely to pick
// the right player-facing message (not found / already used / expired).
//
// Uses the service-role client: transfer_codes is a server-only table (anon has
// no RLS policy at all — a code maps to a device_uuid, the platform's de-facto
// bearer credential, so the table must never be readable with the public key).
//
// The `error` strings here are player-facing copy, not codes: useProfile's
// claimTransferCode throws `err.error` and the UI renders it verbatim. They go
// out through jsonMessage — the envelope's message channel — precisely so a
// later pass at "stop leaking implementation detail" cannot quietly replace
// them with `db_error` and blank the player's explanation.

import { NextRequest, NextResponse } from "next/server";
import { jsonMessage, parseJson } from "@/lib/apiRoute";
import { getServiceRoleClient, table } from "@/lib/supabase";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const parsed = await parseJson<{ code: string }>(req);
  if (!parsed.ok) return parsed.response;

  const code = (parsed.body.code ?? "").trim().toUpperCase();
  if (!code) {
    return jsonMessage("code is required");
  }

  const supabase = getServiceRoleClient();

  // Atomic claim: mark used and fetch the uuid in one statement. An already
  // used, expired, or missing code matches zero rows.
  const { data: claimed, error: claimErr } = await table(supabase, "transfer_codes")
    .update({ used: true })
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .select("device_uuid");

  if (claimErr) {
    return jsonMessage("Ο κωδικός δεν βρέθηκε.", 404);
  }

  if (!claimed || claimed.length === 0) {
    // Claim failed — look the row up only to explain why.
    const { data: row } = await table(supabase, "transfer_codes")
      .select("used, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (!row) {
      return jsonMessage("Ο κωδικός δεν βρέθηκε.", 404);
    }
    if (new Date(row.expires_at) < new Date() && !row.used) {
      return jsonMessage("Ο κωδικός έχει λήξει.", 410);
    }
    return jsonMessage("Ο κωδικός έχει ήδη χρησιμοποιηθεί.", 410);
  }

  const { device_uuid } = claimed[0];

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
