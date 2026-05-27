// POST /api/transfer — generate a single-use transfer code for cross-device migration.
//
// The code is a 6-char alphanumeric string (no ambiguous chars: I/1/O/0).
// It is valid for 24 hours and can only be used once.
// The receiving device POSTs the code to /api/transfer/claim to adopt the uuid.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

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
  let body: { device_uuid: string };
  try {
    body = (await req.json()) as { device_uuid: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { device_uuid } = body;
  if (!device_uuid) {
    return NextResponse.json({ error: "device_uuid is required" }, { status: 400 });
  }

  const supabase   = getSupabaseClient();
  const code       = generateCode();
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("transfer_codes") as any).insert({
    code,
    device_uuid,
    expires_at,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code });
}
