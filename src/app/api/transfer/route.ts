// POST /api/transfer — generate a single-use transfer code for cross-device migration.
//
// The code is a 6-char alphanumeric string (no ambiguous chars: I/1/O/0),
// drawn from crypto.getRandomValues — codes are short-lived secrets, so
// Math.random() is not acceptable here.
// It is valid for 24 hours and can only be used once.
// The receiving device POSTs the code to /api/transfer/claim to adopt the uuid.
//
// Uses the service-role client: transfer_codes is a server-only table (anon has
// no RLS policy at all — a code maps to a device_uuid, the platform's de-facto
// bearer credential, so the table must never be readable with the public key).

import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getServiceRoleClient, table } from "@/lib/supabase";

export const runtime = "edge";

// 32 chars — divides 256 evenly, so byte % length has no modulo bias.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += CODE_CHARS[byte % CODE_CHARS.length];
  }
  return code;
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson<{ device_uuid: string }>(req);
  if (!parsed.ok) return parsed.response;

  const { device_uuid } = parsed.body;
  if (!device_uuid) {
    return jsonMessage("device_uuid is required");
  }

  const supabase   = getServiceRoleClient();
  const code       = generateCode();
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await table(supabase, "transfer_codes").insert({
    code,
    device_uuid,
    expires_at,
  });

  if (error) {
    return jsonError("db_error", error.message);
  }

  return NextResponse.json({ code });
}
