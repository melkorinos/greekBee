// POST /api/transfer — generate a single-use transfer code for cross-device migration.
//
// The code is a 6-char alphanumeric string (no ambiguous chars: I/1/O/0).
// It is valid for 24 hours and can only be used once.
// The receiving device POSTs the code to /api/transfer/claim to adopt the uuid.

import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";

export const runtime = "edge";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
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

  const supabase   = getSupabaseClient();
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
